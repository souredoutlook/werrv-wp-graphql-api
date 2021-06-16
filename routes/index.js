require('dotenv').config({path: '.env'});

const { SHOP, ACCESS_TOKEN } = process.env;

const express = require('express');
const router = express.Router();
const { query, generateVariables } = require('../helpers/discounts');


module.exports = (fetch) => {

  router.post('/', function(req, res) {

    console.log(req.body);

    const { identifier, discountCodeName, codeType } = req.body;

    if (identifier, discountCodeName, codeType) {
      const variables = generateVariables(identifier, discountCodeName, codeType)
  
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
            //modify this to send the discount code and discount code url
            res.send(codeDiscountNode);
          } else {
            //design decision: send the first error, as errors are resolved the list will shrink to zero
            res.send(userErrors[0].message);
          }
        }
      });
    } else {  
      res.send("Some required fields are missing.")
    }
  });

  return router;
};
