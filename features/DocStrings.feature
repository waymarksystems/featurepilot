Feature: DocStrings in steps
  As a test engineer
  I want to use DocStrings in my feature files
  So that I can provide multi-line text arguments to steps

  Background:
    Given the user has started a new session

  Scenario: Upload feature file with DocStrings
    Given the user uploads a feature file containing steps with DocStrings
    When the feature is parsed
    Then the DocStrings should be preserved
    And each DocString should be associated with its step
    And the DocString content should be displayed below the step

  Scenario: Display DocString in step view
    Given a scenario with a step containing a DocString
      """
      This is a multi-line
      DocString with multiple lines
      of text content
      """
    When the user views the scenario
    Then the step should display the DocString text
    And the DocString should maintain line breaks
    And the DocString should be visually distinct from the step text

  Scenario: Import Cucumber report with DocString arguments
    Given a Cucumber JSON report contains steps with DocString arguments
    When the report is imported
    Then each DocString should appear in the step's arguments array
    And the arguments should have "content" and "line" properties
    And the DocString content should be preserved exactly as in the report

  Scenario: Export report preserves DocStrings
    Given steps have been marked with results
    And some steps contain DocStrings
    When the user exports to Cucumber JSON format
    Then the exported report should include DocStrings in the arguments array
    And each DocString argument should have correct content and line number
    And the DocString formatting should be preserved

  Scenario: Multiple steps with DocStrings in same scenario
    Given a scenario with multiple steps
    When the first step has a DocString
      """
      First DocString content
      """
    And the second step also has a DocString
      """
      Second DocString content
      with multiple lines
      """
    Then each DocString should be preserved independently
    And each DocString should be associated with the correct step

  Scenario: Empty DocStrings are handled
    Given a step with an empty DocString
      """
      """
    When the feature is parsed
    Then the empty DocString should be preserved
    And the step should still display correctly

  Scenario: DocStrings with special characters
    Given a step with a DocString containing special characters
      """
      {
        "json": "example",
        "special": "chars: <>&\"'",
        "escaped": "line\nbreak"
      }
      """
    When the feature is parsed
    Then all special characters should be preserved
    And JSON formatting should be maintained
    And escaped characters should remain intact
