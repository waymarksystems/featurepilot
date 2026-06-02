import React, { useEffect, useState } from 'react';
import { Button, Card, ListGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import db from '../db/indexedDb';
import { formatDateTime } from '../utils/formatDate';

function Home() {
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSessions() {
      const all = await db.sessions.toArray();
      setSessions(all.sort((a, b) => b.createdAt - a.createdAt));
    }
    fetchSessions();
  }, []);

  const handleStart = async () => {
    const now = new Date();
    const formattedDate = formatDateTime(now);
  
    // First add the session with placeholder title
    const id = await db.sessions.add({
      name: `Session (pending ID) - ${formattedDate}`,
      createdAt: now.getTime(),
    });
  
    // Now update it with the ID in the title
    await db.sessions.update(id, {
      name: `Session #${id} - ${formattedDate}`
    });
  
    navigate(`/session/${id}`);
  };

  return (
    <div>
      <h1>Welcome to FeaturePilot</h1>

      {sessions.length === 0 ? (
        <Card className="mt-4">
          <Card.Body className="text-center">
            <p>No previous sessions found.</p>
            <Button onClick={handleStart}>Start a Test Session</Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Button className="mt-3" onClick={handleStart}>Start New Session</Button>

          <h3 className="mt-4">Recent Sessions</h3>
          <ListGroup>
            {sessions.map((sesh) => (
              <ListGroup.Item key={sesh.id}>
                <Link to={`/session/${sesh.id}`}>{sesh.name}</Link>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </>
      )}
    </div>
  );
}

export default Home;