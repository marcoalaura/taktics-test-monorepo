const CalculateTotals = require('./budget/methods/calculate-totals');

module.exports = function(Budget) {
  CalculateTotals(Budget).register();
};

