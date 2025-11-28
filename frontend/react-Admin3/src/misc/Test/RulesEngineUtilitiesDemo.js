import React, { useState } from 'react';
import { Container, Nav, Tab, Alert } from 'react-bootstrap';
import MessageClassificationDemo from './MessageClassificationDemo';
import ContentParsingDemo from './ContentParsingDemo';
import ContextBuildingDemo from './ContextBuildingDemo';
import ProcessingPipelineDemo from './ProcessingPipelineDemo';

/**
 * Combined demo component for all rules engine utilities
 */
const RulesEngineUtilitiesDemo = () => {
  return (
    <Container className="mt-4">
      <h1 className="mb-4">Rules Engine Utilities Demo</h1>
      <p className="lead">
        Interactive demonstration of the refactored rules engine utilities
      </p>

      <Alert variant="success" className="mb-4">
        <Alert.Heading>🎉 Complete Refactoring Implementation</Alert.Heading>
        <p>
          All utilities have been implemented and are ready for testing. The <strong>Processing Pipeline</strong> tab
          shows the complete end-to-end workflow that combines all the individual utilities.
        </p>
        <hr />
        <p className="mb-0">
          <strong>Benefits achieved:</strong> Testability, Readability, Maintainability, Reusability, Type Safety, and Debugging
        </p>
      </Alert>

      <Tab.Container defaultActiveKey="pipeline">
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="pipeline">
              🔄 Processing Pipeline
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="classification">
              📋 Message Classification
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="parsing">
              📝 Content Parsing
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="context">
              🏗️ Context Building
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="pipeline">
            <ProcessingPipelineDemo />
          </Tab.Pane>
          <Tab.Pane eventKey="classification">
            <MessageClassificationDemo />
          </Tab.Pane>
          <Tab.Pane eventKey="parsing">
            <ContentParsingDemo />
          </Tab.Pane>
          <Tab.Pane eventKey="context">
            <ContextBuildingDemo />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
};

export default RulesEngineUtilitiesDemo;