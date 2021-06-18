// helpers/discounts

const query = `
  mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) { 
    discountCodeBasicCreate(
      basicCodeDiscount: $basicCodeDiscount
    ) 
    { 
      codeDiscountNode { 
        id 
      }
      userErrors { 
        code extraInfo field message 
      } 
    } 
  }
`;

const generateVariables = function(identifier, discountCodeName, codeType) {
  //the unique attributes of each type of discount, as outlined in the specifications
  const constants = {
    '10% Off Single Use': { appliesOncePerCustomer: true, percentage: 0.1 },
    '5% Off All Orders': { appliesOncePerCustomer: false, percentage: 0.05 },
    '10% Off All Orders': { appliesOncePerCustomer: false, percentage: 0.1 },
  };

  if (constants[codeType]) {
    const { appliesOncePerCustomer, percentage } = constants[codeType];
  
    return {
      "basicCodeDiscount": {
        "customerSelection": { "all": true },
        // new discount codes are timestamped with a string representing the date in ISO 8601 Extended Format as per Shopify docs
        "startsAt": new Date(Date.now()).toISOString(),
        "title": `${identifier}.${discountCodeName}`,
        "code": discountCodeName,
        appliesOncePerCustomer,
        "customerGets": {
            "items": {"all": true },
            "value": { percentage } 
        },
        //usageLimit defines the maximum number of times a code can be used by any customer
        "usageLimit": null,
      }
    };
  } else {
    return null;
  }
};

module.exports = { query, generateVariables};