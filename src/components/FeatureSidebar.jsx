import { ListGroup } from 'react-bootstrap';
import { useLiveQuery } from 'dexie-react-hooks';
import { FaTimesCircle } from 'react-icons/fa';
import db from '../db/indexedDb';

function FeatureSidebar({ features, selectedId, onSelect, onDelete }) {

  const activities = useLiveQuery(async () => {
    if (!features?.[0]?.sessionId) return [];
    return await db.activities
      .where('sessionId')
      .equals(features[0].sessionId)
      .reverse()
      .sortBy('timestamp');
  }, [features]) || [];

  return (
    <>
      <style>{`
        .feature-item-delete {
          opacity: 0;
          transition: opacity 0.2s;
          color: #dc3545;
        }
        .feature-item:hover .feature-item-delete {
          opacity: 1;
        }
        .feature-item.active .feature-item-delete {
          color: #fff;
        }
        .feature-item-delete:hover {
          color: #bd2130;
        }
      `}</style>
      <div className="flex-shrink-0 overflow-hidden" style={{ width: '300px' }}>
        <div className="mb-5">
          <h5 className="p-3">Features</h5>
          <ListGroup variant="flush">
            {features.length === 0 ? (
              <ListGroup.Item className="text-muted fst-italic">
                No features added yet
              </ListGroup.Item>
            ) : (
              features.map((f) => (
                <ListGroup.Item
                  key={f.id}
                  active={f.id === selectedId}
                  action
                  className={`text-truncate feature-item d-flex justify-content-between align-items-center ${f.id === selectedId ? 'active' : ''}`}
                >
                  <span onClick={() => onSelect(f)} style={{ flexGrow: 1, cursor: 'pointer', maxWidth: '260px' }}>
                    {f.title}
                  </span>
                  {onDelete && (
                    <button
                      className="btn btn-link btn-sm p-0 ms-2 feature-item-delete"
                      style={{ fontSize: '1rem', lineHeight: 1, minWidth: '20px', border: 'none', background: 'none' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(f.id, f.title);
                      }}
                      title="Delete this feature"
                    >
                      <FaTimesCircle />
                    </button>
                  )}
                </ListGroup.Item>
              ))
            )}
          </ListGroup>
        </div>

        {activities.length > 0 && (
          <div className="overflow-auto" style={{ maxHeight: '500px' }}>
            <h5 className="p-3">Activity</h5>
            <ul className="list-unstyled small mb-0 px-3">
              {activities.map((log, idx) => (
                <li key={idx} className="mb-2">
                  <div>
                    <strong>{log.user}</strong> {log.message}{' '}
                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

export default FeatureSidebar;