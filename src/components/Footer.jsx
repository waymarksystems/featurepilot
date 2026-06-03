import React from 'react';
import { Container, Image } from 'react-bootstrap';

function Footer() {
  return (
    <footer className="bg-light text-center py-3 mt-5">
      <Container>
        <small>
          <Image 
            src="/logo/featurepilot-plane-transparent.png" 
            alt="plane" 
            style={{ height: '24px', margin: '0 4px 4px 4px' }}
          /> 
          <strong style={{ marginRight: '10px' }}>FeaturePilot</strong>
          
          Made by humans 👨 for gherkins 🥒 View on{' '}
          <a href="https://github.com/waymarksystems/featurepilot" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </small>
      </Container>
    </footer>
  );
}

export default Footer;