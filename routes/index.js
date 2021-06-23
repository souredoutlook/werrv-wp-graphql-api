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

  router.get('/:identifier', function(req, res) {

    console.log(req.params);
    const {identifier} = req.params;
    console.log(identifier);

    if (identifier !== 'undefined') {

      const query_ID_from_user_login = `SELECT * FROM jce_users WHERE user_login = ?`;
  
      pool.query(query_ID_from_user_login, [identifier], function (error, results, fields) {
        if (error) {
          //issue with identifier
          res.send(400, 'Something went wrong while fetching your current discount codes...');
        } else {
          const { ID } = results[0];
          
          const query_fields_from_user_id = `SELECT * FROM jce_wpforms_entries WHERE user_id = ? AND form_id = 470`
          
          pool.query(query_fields_from_user_id, [ID], function (error, results, fields) {
            if (error) {
              //this shouldn't happen
              res.send(400, 'Something went wrong while fetching your current discount codes...');
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
      
                let responseString = `
                You have already generated ${codes.length} of 3 discount codes.
                ${codes.length === 3 ? 'Please reach out to Werrv directly to create more.' : ''}
                Your discount code${codes.length === 1 ? ' is' : 's are'}:
                `;
      
                for (let i = 0; i < codes.length; i++) {
                  if (i + 1 === codes.length) {
                    responseString += `${codes[i]}.`
                  } else {
                    responseString += `${codes[i]}, `
                  }
                };
      
                res.send({count: codes.length, responseString});
              } else {
                res.send({count: 0, responseString: `It look's like you haven't created any discount codes yet...`})
              }
            }
          });
        } 
      });
  
    } else {
      //WPforms sends undefined
      res.send(400, 'Something went wrong while fetching your current discount codes...');  
    }

  });

  router.post('/', function(req, res) {

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

              // console.log(codeDiscountNode)
              
              // //modify this to send the discount code and discount code url
              // fetch(`https://${SHOP}.myshopify.com/admin/api/graphql.json`, {
              // method: "POST",
              // headers: {
              //   "Content-Type": "application/json",
              //   "X-Shopify-Access-Token": ACCESS_TOKEN
              // },
              // body: JSON.stringify({ query: `
              // { node(id: "${codeDiscountNode.id}") {
              //     ... on DiscountCodeNode {
              //       codeDiscount {
              //         __typename
              //         ... on DiscountCodeBasic {
              //           title
              //           summary
              //           codes(first: 5) {
              //             edges {
              //               node {
              //                 code
              //               }
              //             }
              //           }
              //         }
              //       }
              //     }
              //   }
              // }
              // `})
              // })
              // .then(result => {
              //   return result.json();
              // })
              // .then(json => {
              //   const {data} = json;
              //   console.log(json);
                res.send(codeDiscountNode.id);
              // })
            } else {
              //design decision: send the first error, as errors are resolved the list will shrink to zero
              res.send(400, userErrors[0].message);
            }
          }
        });
      } else {  
        res.send(400, "Some fields are invalid.");
      }
    } else {
        res.send(400, "Some required fields are missing.");
    }
  });

  return router;
};
