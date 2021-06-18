require('dotenv').config({path: '.env'});

const { SHOP, ACCESS_TOKEN, DB_HOST, DB_USER, DB_PASSWORD, DATABASE } = process.env;

const express = require('express');
const router = express.Router();

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : DB_HOST,
  user     : DB_USER,
  password : DB_PASSWORD,
  database : DATABASE
});

const { query, generateVariables } = require('../helpers/discounts');


module.exports = (fetch) => {

  router.get('/', function(req, res) {
    res.send("Here I am!");
    // const query = `
    //   {
    //     codeDiscountNodeByCode(code: "refactored") {
    //       id
    //     }
    //   }
    // `;

    // fetch(`https://${SHOP}.myshopify.com/admin/api/graphql.json`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "X-Shopify-Access-Token": ACCESS_TOKEN
    //   },
    //   body: JSON.stringify({query})
    //   })
    //   .then(result => {
    //     return result.json();
    //   })
    //   .then(json => {
    //     res.send(json)
    //   });

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
                res.send(data);
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
