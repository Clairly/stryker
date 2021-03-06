import {
  CoverageCollection, CoverageResult, CoverageCollectionPerTest, CoverageData,
  StatementMap, TestRunner, RunnerOptions,
  RunResult, RunOptions, TestRunnerFactory,
  TestStatus, RunStatus
} from 'stryker-api/test_runner';

class MyTestRunner implements TestRunner {

  public run(options: RunOptions) {
    const coverage: CoverageCollection | CoverageCollectionPerTest = {
      'a/file': {
        f: {},
        s: {
          23: 32
        }
      }
    };
    return new Promise<RunResult>(r => r({
      coverage,
      status: RunStatus.Complete,
      tests: [{
        failureMessages: [''],
        name: '',
        status: TestStatus.Failed,
        timeSpentMs: 23
      }]
    }));
  }
}

const runnerOptions: RunnerOptions = {
  fileNames: [
    'foobar.js',
    'foobar.spec.js'
  ],
  strykerOptions: null
};

const runOptions: RunOptions = {
  testHooks: 'test hooks',
  timeout: 42
};

TestRunnerFactory.instance().register('MyTestRunner', MyTestRunner);
const myTestRunner = TestRunnerFactory.instance().create('MyTestRunner', runnerOptions);
if (!(myTestRunner instanceof MyTestRunner)) {
  throw Error('Something wrong with myTestRunner');
}

console.log(TestRunnerFactory.instance().knownNames());
const coverageData: CoverageData = {};
const statementMap: StatementMap = {};
statementMap['23'] = { start: { line: 23, column: 23 }, end: { line: 42, column: 42 } };
coverageData['32'] = 24;
const coverageResult: CoverageResult = {
  f: coverageData,
  s: coverageData
};
