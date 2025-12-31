import angular from 'angular';
import budgetsListUrl from './views/budgets.list.html';
import budgetDetailUrl from './views/budget.detail.html';
import BudgetsListController from './controllers/budgets.list.controller';
import BudgetDetailController from './controllers/budget.detail.controller';
import BudgetCreateModalController from './controllers/budget.create.modal.controller';

const module = angular.module('app.budgets', []);

module.config(routeConfig);
module.controller('BudgetCreateModalController', BudgetCreateModalController);

export default module.name;

function routeConfig($stateProvider) {
  $stateProvider
    .state('budgets', {
      url: '/budgets',
      templateUrl: budgetsListUrl,
      controller: BudgetsListController,
      controllerAs: 'vm',
    })
    .state('budget-create', {
      url: '/budgets/create',
      templateUrl: budgetDetailUrl,
      controller: BudgetDetailController,
      controllerAs: 'vm',
    })
    .state('budget-edit', {
      url: '/budgets/:id/edit',
      templateUrl: budgetDetailUrl,
      controller: BudgetDetailController,
      controllerAs: 'vm',
    });
}

routeConfig.$inject = ['$stateProvider'];

