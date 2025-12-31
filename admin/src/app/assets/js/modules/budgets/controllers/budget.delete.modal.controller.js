export default function BudgetDeleteModalController($uibModalInstance, budget) {
  const vm = this;

  vm.budget = budget;
  vm.accept = accept;
  vm.cancel = cancel;

  function accept() {
    $uibModalInstance.close();
  }

  function cancel() {
    $uibModalInstance.dismiss('cancel');
  }
}

BudgetDeleteModalController.$inject = ['$uibModalInstance', 'budget'];

