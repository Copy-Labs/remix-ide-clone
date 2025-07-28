# Git Integration Test Suite

This directory contains comprehensive tests for the Git integration functionality in the Remix IDE
clone. The test suite covers all aspects of the Git integration including services, stores, UI
components, and end-to-end workflows.

## Test Structure

```
src/test/
├── components/          # UI component tests
│   └── GitPanel.test.tsx
├── services/           # Service layer tests
│   └── gitService.test.ts
├── stores/             # State management tests
│   └── gitStore.test.ts
├── integration/        # End-to-end workflow tests
│   └── gitIntegration.test.ts
├── utils/              # Test utilities and helpers
│   └── testHelpers.ts
└── README.md           # This file
```

## Test Categories

### 1. Service Layer Tests (`services/gitService.test.ts`)

Tests the low-level Git operations and file system adapter:

- **GitFileSystemAdapter**: Tests file system operations (read, write, mkdir, etc.)
- **GitService**: Tests Git operations (init, clone, add, commit, push, pull, etc.)
- **Error Handling**: Tests error scenarios and edge cases
- **File System Integration**: Tests integration with the file store

**Key Test Areas:**

- File operations (read, write, delete)
- Directory operations (create, list, remove)
- Git repository operations
- Remote repository operations
- Error handling and recovery

### 2. Store Tests (`stores/gitStore.test.ts`)

Tests the Git store state management and business logic:

- **Repository Operations**: Initialize, clone repositories
- **Branch Management**: Create, switch, delete branches
- **Commit Operations**: Stage files, create commits
- **Remote Operations**: Add remotes, push, pull, fetch
- **GitHub Integration**: Connect, list repos, create repos
- **Configuration**: User settings, GitHub tokens
- **Error States**: Loading states, error handling

**Key Test Areas:**

- State transitions and updates
- Async operation handling
- Error state management
- GitHub API integration
- Configuration management

### 3. Component Tests (`components/GitPanel.test.tsx`)

Tests the Git panel UI component and user interactions:

- **Uninitialized State**: Repository initialization options
- **Initialized State**: Full Git panel with tabs
- **User Interactions**: Button clicks, form submissions
- **Tab Navigation**: Changes, Branches, History, GitHub tabs
- **Dialog Interactions**: Modal forms and confirmations
- **Loading States**: Button states during operations
- **Error Display**: Error messages and alerts

**Key Test Areas:**

- Component rendering
- User event handling
- Form validation
- Dialog interactions
- State-dependent UI changes

### 4. Integration Tests (`integration/gitIntegration.test.ts`)

Tests complete end-to-end workflows:

- **Repository Initialization**: Complete setup workflow
- **File Management**: Create, stage, commit files
- **Branch Workflows**: Feature branch development
- **Remote Workflows**: Push, pull, synchronization
- **Error Recovery**: Handling and recovering from failures
- **Complex Scenarios**: Multi-step development workflows

**Key Test Areas:**

- Complete user workflows
- Multi-step operations
- Error recovery scenarios
- Performance considerations
- Real-world usage patterns

## Test Utilities (`utils/testHelpers.ts`)

Comprehensive utilities for testing:

### Mock Factories

- `createMockCommit()`: Creates mock commit objects
- `createMockBranch()`: Creates mock branch objects
- `createMockRemote()`: Creates mock remote objects
- `createMockStatus()`: Creates mock file status objects
- `createMockGithubRepo()`: Creates mock GitHub repository objects

### Service Mocks

- `createMockGitService()`: Creates mocked Git service
- `createMockFileStore()`: Creates mocked file store
- `createMockOctokit()`: Creates mocked Octokit instance

### Scenario Builders

- `buildRepositoryScenario()`: Builds different repository states
- `setupGitServiceMocks()`: Sets up Git service mocks
- `setupOctokitMocks()`: Sets up GitHub API mocks
- `setupFileSystemMocks()`: Sets up file system mocks

### Test Helpers

- `expectGitServiceCalled()`: Assertion helper for service calls
- `expectStoreState()`: Assertion helper for store state
- `waitForStoreUpdate()`: Async helper for state changes
- `measureExecutionTime()`: Performance testing helper

## Running Tests

### Run All Tests

```bash
npm run test
```

### Run Specific Test Suites

```bash
# Run only Git service tests
npm run test src/test/services/gitService.test.ts

# Run only Git store tests
npm run test src/test/stores/gitStore.test.ts

# Run only component tests
npm run test src/test/components/GitPanel.test.tsx

# Run only integration tests
npm run test src/test/integration/gitIntegration.test.ts
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test -- --watch
```

### Run Tests with UI

```bash
npm run test:ui
```

## Test Coverage Goals

The test suite aims for comprehensive coverage:

- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: >95%
- **Statement Coverage**: >90%

### Coverage Areas

1. **Git Operations**: All Git commands and operations
2. **File System**: File and directory operations
3. **State Management**: Store actions and state transitions
4. **UI Interactions**: User events and component behavior
5. **Error Handling**: Error scenarios and recovery
6. **GitHub Integration**: API calls and authentication
7. **Configuration**: Settings and preferences

## Test Data and Mocking

### Mock Strategy

- **Services**: Fully mocked to isolate business logic
- **External APIs**: Mocked GitHub API responses
- **File System**: Mocked file operations
- **UI Components**: Mocked complex UI components

### Test Data

- **Commits**: Generated with realistic metadata
- **Branches**: Various branch scenarios
- **Files**: Different file types and states
- **Repositories**: Various repository configurations

## Best Practices

### Test Organization

- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Clean up after each test

### Mocking

- Mock external dependencies
- Use factory functions for test data
- Reset mocks between tests
- Verify mock interactions

### Assertions

- Use specific assertions
- Test both success and error cases
- Verify state changes
- Check side effects

### Async Testing

- Use proper async/await patterns
- Handle promise rejections
- Test loading states
- Use timeouts appropriately

## Debugging Tests

### Common Issues

1. **Mock not working**: Check mock setup and imports
2. **Async test failing**: Ensure proper await usage
3. **State not updating**: Check store state management
4. **Component not rendering**: Verify mock components

### Debugging Tools

- Use `console.log` for debugging
- Check mock call history
- Verify test data setup
- Use debugger statements

### Test Isolation

- Ensure tests don't depend on each other
- Reset state between tests
- Clear mocks properly
- Use fresh instances

## Performance Considerations

### Test Performance

- Keep tests fast and focused
- Use minimal setup
- Avoid unnecessary async operations
- Mock heavy operations

### Memory Management

- Clean up resources
- Reset large objects
- Avoid memory leaks in mocks
- Use appropriate timeouts

## Continuous Integration

### CI Configuration

Tests are configured to run in CI with:

- Coverage reporting
- JUnit XML output
- JSON coverage reports
- Parallel execution

### Quality Gates

- All tests must pass
- Coverage thresholds must be met
- No console errors or warnings
- Performance benchmarks met

## Contributing

When adding new Git functionality:

1. **Add Service Tests**: Test the low-level operations
2. **Add Store Tests**: Test state management
3. **Add Component Tests**: Test UI interactions
4. **Add Integration Tests**: Test complete workflows
5. **Update Documentation**: Update this README

### Test Naming Convention

- Use descriptive names
- Follow pattern: `should [expected behavior] when [condition]`
- Group related tests in describe blocks
- Use consistent terminology

### Mock Guidelines

- Mock external dependencies
- Use realistic test data
- Verify mock interactions
- Clean up after tests

## Troubleshooting

### Common Test Failures

1. **Import Errors**
   - Check mock setup in test files
   - Verify import paths
   - Ensure dependencies are installed

2. **Async Test Issues**
   - Use proper async/await
   - Handle promise rejections
   - Check timeout values

3. **Mock Issues**
   - Verify mock implementation
   - Check mock call arguments
   - Reset mocks between tests

4. **State Issues**
   - Check store initialization
   - Verify state updates
   - Ensure proper cleanup

### Getting Help

- Check test output for specific errors
- Review mock setup and configuration
- Verify test data and expectations
- Use debugging tools and techniques

## Future Improvements

### Planned Enhancements

- Add performance benchmarks
- Expand error scenario coverage
- Add accessibility testing
- Improve test data generation

### Test Automation

- Automated test generation
- Visual regression testing
- Cross-browser testing
- Load testing scenarios

This comprehensive test suite ensures the Git integration functionality works correctly and reliably
across all use cases and scenarios.
