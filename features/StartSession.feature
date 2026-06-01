Feature: Starting and managing test sessions
  As a test engineer
  I want to create and manage test sessions
  So that I can organize my test execution work

  Background:
    Given the user is authenticated

  Scenario: User starts a new session from the home screen
    Given FeaturePilot is open
    And no previous sessions exist
    When the user clicks "Start a Test Session"
    Then a new session should be created with a unique ID
    And the user should be navigated to the session page
    And the session should be stored in IndexedDB

  Scenario: User starts a session with existing sessions
    Given FeaturePilot is open
    And previous sessions exist
    When the user clicks "Start New Session"
    Then a new session should be created
    And previous sessions should still be listed
    And the new session should have a unique ID

  Scenario: View existing sessions
    Given the user has created multiple sessions
    When they are on the home page
    Then all sessions should be listed
    And each session should show its ID
    And sessions should be clickable to resume

  Scenario: Resume an existing session
    Given a session was previously created
    When the user clicks on the session
    Then they should be navigated to that session
    And all features and steps should be preserved
    And all activity logs should be intact

  Scenario: Delete a session
    Given the user is viewing a session
    When they click "Delete Session"
    Then a confirmation dialog should appear
    When they confirm deletion
    Then the session should be removed from IndexedDB
    And all associated features, steps, images, and activities should be deleted
    And the user should be redirected to the home page
