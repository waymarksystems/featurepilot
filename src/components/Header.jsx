import React from 'react';
import { Navbar, Container, Nav, Image, Button, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/indexedDb';

function Header({ user, onLogout }) {
  const navigate = useNavigate();

  const sessions = useLiveQuery(async () => {
    return await db.sessions
      .orderBy('createdAt')
      .reverse()
      .limit(10)
      .toArray();
  }, []) || [];

  const handleSessionSelect = (sessionId) => {
    navigate(`/session/${sessionId}`);
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container fluid>
        <Navbar.Brand as={Link} to="/">FeaturePilot ✈️</Navbar.Brand>
        <Nav style={{ position: 'relative' }}>
          {user && (
            <Dropdown align="start">
              <Dropdown.Toggle variant="dark" id="sessions-dropdown">
                Sessions
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {sessions.length === 0 ? (
                  <Dropdown.Item disabled>No sessions yet</Dropdown.Item>
                ) : (
                  sessions.map((session) => (
                    <Dropdown.Item
                      key={session.id}
                      onClick={() => handleSessionSelect(session.id)}
                    >
                      {session.name}
                    </Dropdown.Item>
                  ))
                )}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </Nav>
        <Nav className="ms-auto">
          {user && (
            <Nav.Item className="d-flex align-items-center gap-2">
              {user.photoURL && (
                <Image
                  src={user.photoURL}
                  roundedCircle
                  width="30"
                  height="30"
                  alt="profile"
                />
              )}
              <span style={{ color: '#fff' }}>{user.displayName || user.email}</span>
              <Button variant="outline-light" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </Nav.Item>
          )}
        </Nav>
      </Container>
    </Navbar>
  );
}

export default Header;