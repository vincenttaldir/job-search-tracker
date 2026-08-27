import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Pane, Heading, Badge, Text } from 'evergreen-ui';
import { CVScoreBadge } from '../components/CVScoreBadge';
import { useNavigate } from 'react-router-dom';
import { STATUSES, statusCode } from '../components/StatusPill';

/**
 * Kanban board. Columns are driven by the STATUSES registry and keyed by the STABLE numeric
 * `code` (droppableId), so cards are matched by code (app.status_code) — not by the column's
 * display label. Renaming a label never breaks matching or drag-and-drop.
 */
export function KanbanBoard({ applications, onDragEnd, isLoading }) {
  const navigate = useNavigate();

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Pane display="flex" gap={12} overflowX="auto" padding={12} background="#f5f5f5" borderRadius={4}>
        {STATUSES.map((col) => {
          const statusApps = applications.filter((app) => statusCode(app) === col.code);
          return (
            <Droppable key={col.code} droppableId={String(col.code)} type="APPLICATION">
              {(provided, snapshot) => (
                <Pane
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  minWidth="300px"
                  background={snapshot.isDraggingOver ? '#f0f7ff' : '#ffffff'}
                  border={snapshot.isDraggingOver ? '2px solid #4a90e2' : '1px solid #e0e0e0'}
                  borderRadius={4}
                  padding={12}
                  transition="all 0.2s ease"
                >
                  <Pane marginBottom={12} paddingBottom={12} borderBottom="2px solid #e0e0e0">
                    <Heading size={500}>{col.label}</Heading>
                    <Badge marginTop={8} display="block" width="fit-content">
                      {statusApps.length}
                    </Badge>
                  </Pane>
                  <Pane display="flex" flexDirection="column" gap={8} minHeight="200px">
                    {statusApps.map((app, index) => (
                      <Draggable
                        key={app.id}
                        draggableId={`app-${app.id}`}
                        index={index}
                        isDragDisabled={isLoading}
                      >
                        {(provided, snapshot) => (
                          <Pane
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            padding={12}
                            background={snapshot.isDragging ? '#fff3cd' : '#f9f9f9'}
                            border={snapshot.isDragging ? '2px solid #ff9800' : '1px solid #d9d9d9'}
                            borderRadius={3}
                            cursor={isLoading ? 'default' : 'grab'}
                            onClick={() => navigate(`/applications/${app.id}`)}
                            _hover={{ background: snapshot.isDragging ? '#fff3cd' : '#f0f0f0' }}
                            boxShadow={snapshot.isDragging ? '0 5px 15px rgba(0,0,0,0.3)' : 'none'}
                            transition="all 0.2s ease"
                          >
                            <Text size={400} fontWeight="500" display="block" marginBottom={4}>
                              {app.job_title}
                            </Text>
                            <Text size={300} color="#666">
                              {app.company?.name || 'N/A'}
                            </Text>
                            {app.cv_match_score && (
                              <Pane marginTop={6}>
                                <CVScoreBadge score={app.cv_match_score} />
                              </Pane>
                            )}
                          </Pane>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {statusApps.length === 0 && (
                      <Text size={300} color="#ccc" textAlign="center" marginTop={8}>
                        Déposez les candidatures ici
                      </Text>
                    )}
                  </Pane>
                </Pane>
              )}
            </Droppable>
          );
        })}
      </Pane>
    </DragDropContext>
  );
}
