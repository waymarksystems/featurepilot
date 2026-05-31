import React from 'react';
import { Container } from 'react-bootstrap';

function Footer() {
  return (
    <footer className="bg-light text-center py-3 mt-5">
      <Container>
        <small>
          <strong>FeaturePilot ✈️ </strong>Made by humans 👨 for gherkins 🥒 View on{' '}
          <a href="https://github.com/waymarksystems/featurepilot" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </small>
      </Container>
    </footer>
  );
}

export default Footer;