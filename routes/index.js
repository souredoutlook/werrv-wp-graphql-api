require('dotenv').config({path: '.env'});

const { SHOP, ACCESS_TOKEN, DB_HOST, DB_USER, DB_PASSWORD, DATABASE } = process.env;

const express = require('express');
const router = express.Router();

const mysql      = require('mysql');
const pool = mysql.createPool({
  connectionLimit: 10,
  host     : DB_HOST,
  user     : DB_USER,
  password : DB_PASSWORD,
  database : DATABASE
});

const { query, generateVariables } = require('../helpers/discounts');


module.exports = (fetch) => {

  router.get('/:identifier', function (req, res) {

    console.log(req.params);
    const {identifier} = req.params;
    console.log(identifier);

    //in some cases WP can send undefined as the identifier
    if (identifier !== 'undefined') {

      const query_ID_from_user_login = `SELECT * FROM jce_users WHERE user_login = ?`;
  
      pool.query(query_ID_from_user_login, [identifier], function (error, results, fields) {
        if (error) {
          //issue with identifier
          res.status(400).send('Something went wrong while fetching your current discount codes...');
        } else {
          const ID  = results[0] && results[0].ID;

          if (!ID) {
            //the user doesn't exist 
            console.log("!ID")
            res.status(400).send('Something went wrong while fetching your current discount codes...');
          } else {
            const query_fields_from_user_id = `SELECT * FROM jce_wpforms_entries WHERE user_id = ? AND form_id = 470`
            
            pool.query(query_fields_from_user_id, [ID], function (error, results, fields) {
              if (error) {
                //this shouldn't happen
                res.status(400).send('Something went wrong while fetching your current discount codes...');
              } else {
                if (results.length > 0) {
                  const codes = [];
                  
                  //loop over results and parse the fields json, extract value and push into codes
                  for (const result of results) {
                    if (result.fields) {
                      const code = JSON.parse(result.fields)[5]["value"];
                      console.log(code);
                      if (code) {
                        //resolves duplicate entries based on how wpforms_entries collects data
                        if (!codes.includes(code)) {
                          codes.push(code);
                        }
                      }
                    }
                  }
  
                  const promiseArray = [];
                  //send out to shopify and confirm the codes
                  for (const code of codes) {
                    promiseArray.push(
                      fetch(`https://${SHOP}.myshopify.com/admin/api/graphql.json`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": ACCESS_TOKEN
                      },
                      body: JSON.stringify({ query: `
                        {
                          codeDiscountNodeByCode(code: "${code}") {
                            codeDiscount {
                              __typename
                              ... on DiscountCodeBasic {
                                title
                              }
                            }
                          }
                        }                    
                      `})
                      })
                      .then(result => {
                        return result.json();
                      })
                      .then(json => {
                        const { data } = json;
                  
                        if (data && data.codeDiscountNodeByCode) {
                          const { title } = data.codeDiscountNodeByCode.codeDiscount;
                          // titles are patterned user.name.code 
                          const shopifyIdentifier = title.split('.').slice(0,2).join('.');
                          const shopifyCode = title.split('.').slice(2)[0];
                          return ({shopifyIdentifier, shopifyCode});
                        } else {
                          return null;
                        }
                      })
                    );
                  }
  
                  Promise.all(promiseArray)
                  .then(responses => {
                    const validatedCodes = codes.filter((value, index) => {
                      if (responses[index]) {
                        const {shopifyIdentifier, shopifyCode} = responses[index];
                        if (value === shopifyCode && identifier === shopifyIdentifier) {
                          return true;
                        } else {
                          //code exists but doesnt belong to the identified user
                          return false;
                        }
                      } else {
                        //response[index] is null
                        return false;
                      }
                    });
                    
                    let responseString = `
                    You have already generated ${validatedCodes.length} of 3 discount codes.
                    ${validatedCodes.length === 3 ? 'Please reach out to Werrv directly to create more.' : ''}
                    Your discount code${validatedCodes.length === 1 ? ' is' : 's are'}:
                    `;
          
                    for (let i = 0; i < validatedCodes.length; i++) {
                      if (i + 1 === validatedCodes.length) {
                        //add a period on the last code
                        responseString += `${validatedCodes[i]}.`
                      } else {
                        responseString += `${validatedCodes[i]}, `
                      }
                    };
  
                    if (validatedCodes.length > 0) {
                      //send back a list of validated codes
                      res.send({count: validatedCodes.length, responseString, validatedCodes});
                    } else {
                      //the user has some code requests but they have failed or are duplicates
                      res.send({count: 0, responseString: `It look's like you haven't created any discount codes yet...`})
                    }
                  }); 
                } else {
                  //the user has made no code requests
                  res.send({count: 0, responseString: `It look's like you haven't created any discount codes yet...`})
                }
              }
            });
          }          
        } 
      });
    } else {
      //WPforms sends undefined
      res.status(400).send('Something went wrong while fetching your current discount codes...');  
    }
  });

  router.post('/', function (req, res) {

    console.log(req.body);

    const { identifier, discountCodeName, discountCodeType } = req.body;

    if (identifier, discountCodeName, discountCodeType) {
      const variables = generateVariables(identifier, discountCodeName, discountCodeType)
  
      if (variables) {
        fetch(`https://${SHOP}.myshopify.com/admin/api/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN
        },
        body: JSON.stringify({ query, variables })
        })
        .then(result => {
          return result.json();
        })
        .then(json => {
          const { data } = json;
    
          if (data && data.discountCodeBasicCreate) {
            const { codeDiscountNode, userErrors } = data.discountCodeBasicCreate;
    
            if (codeDiscountNode) {

              console.log(codeDiscountNode)
              
              //modify this to send the discount code and discount code url
              fetch(`https://${SHOP}.myshopify.com/admin/api/graphql.json`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN
              },
              body: JSON.stringify({ query: `
                {
                  codeDiscountNode(id: "${codeDiscountNode.id}") {
                    codeDiscount {
                      __typename
                      ... on DiscountCodeBasic {
                        title
                        summary
                      }
                    }
                  }
                }
              `})
              })
              .then(result => {
                return result.json();
              })
              .then(json => {
                console.log(json);
                const {data, errors } = json;
                console.log(data, errors);
                if (errors) {
                  res.status(400).send('Something went wrong when trying to make your new discount code...')
                } else {
                  const { summary } = data.codeDiscountNode.codeDiscount;
                  const responseString = `Congratulations! You have successfully created code: "${discountCodeName}". With the following description: ${summary}. Please copy the link automatic discount link below and share with your customers. Happy shopping!`;
                  const url = `https://werrv.ca/discount/${encodeURIComponent(discountCodeName)}`
                  res.send({responseString, url})
                }
              });
            } else {
              //design decision: send the first error, as errors are resolved the list will shrink to zero
              res.status(400).send(userErrors[0].message);
            }
          }
        });
      } else {  
        res.status(400).send(400, "Some fields are invalid.");
      }
    } else {
        res.status(400).send(400, "Some required fields are missing.");
    }
  });

  return router;
};
