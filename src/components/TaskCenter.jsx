import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pane,
  Text,
  Spinner,
  IconButton,
  TickCircleIcon,
  CrossIcon,
  WarningSignIcon,
  Popover,
  Position,
  Menu,
} from 'evergreen-ui';
import { useTasks } from '../context/TaskContext';
import './TaskCenter.css';

function TaskItem({ task, onClose }) {
  const navigate = useNavigate();
  const { markRead, removeTask } = useTasks();

  const handleClick = () => {
    markRead(task.id);
    if (task.navigateTo) {
      navigate(task.navigateTo);
      onClose();
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    removeTask(task.id);
  };

  const isClickable = task.navigateTo && task.status !== 'running';

  return (
    <Pane
      className={`task-item ${isClickable ? 'task-item--clickable' : ''} ${!task.read && task.status !== 'running' ? 'task-item--unread' : ''}`}
      onClick={isClickable ? handleClick : undefined}
      display="flex"
      alignItems="center"
      gap={10}
      padding="10px 14px"
      borderBottom="1px solid #e8e8e8"
    >
      {/* Status icon */}
      <Pane flexShrink={0} width={20} display="flex" alignItems="center" justifyContent="center">
        {task.status === 'running' && <Spinner size={16} />}
        {task.status === 'done' && <TickCircleIcon color="success" size={16} />}
        {task.status === 'error' && <WarningSignIcon color="danger" size={16} />}
      </Pane>

      {/* Text */}
      <Pane flex={1} minWidth={0}>
        <Text size={400} fontWeight={task.read ? 400 : 600} display="block">
          {task.label}
        </Text>
        {task.message && (
          <Text size={300} color="#666" display="block" marginTop={2}>
            {task.message}
          </Text>
        )}
        {task.status === 'running' && task.total > 0 && (
          <Pane marginTop={6}>
            <Pane
              height={4}
              borderRadius={2}
              background="#e8e8e8"
              overflow="hidden"
            >
              <Pane
                height="100%"
                borderRadius={2}
                background="#3366ff"
                width={`${Math.round((task.progress / task.total) * 100)}%`}
                style={{ transition: 'width 0.4s ease' }}
              />
            </Pane>
            <Text size={300} color="#999" display="block" marginTop={2}>
              {task.progress}/{task.total} entreprises
              {task.found > 0 ? ` · ${task.found} offre${task.found > 1 ? 's' : ''} trouvée${task.found > 1 ? 's' : ''}` : ''}
            </Text>
          </Pane>
        )}
        {task.status === 'error' && task.error && (
          <Text size={300} color="#D14343" display="block" marginTop={2}>
            {task.error}
          </Text>
        )}
      </Pane>

      {/* Dismiss button (only for completed tasks) */}
      {task.status !== 'running' && (
        <IconButton
          icon={CrossIcon}
          height={20}
          appearance="minimal"
          onClick={handleDismiss}
          title="Supprimer"
          flexShrink={0}
        />
      )}
    </Pane>
  );
}

export function TaskCenter() {
  const { tasks, unreadCount } = useTasks();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);

  const hasRunning = tasks.some((t) => t.status === 'running');
  const runningTask = tasks.find((t) => t.status === 'running');

  if (tasks.length === 0) return null;

  return (
    <Popover
      isShown={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
      position={Position.BOTTOM_RIGHT}
      content={
        <Pane width={320} maxHeight={400} overflowY="auto" borderRadius={4}>
          <Pane
            padding="10px 14px"
            borderBottom="1px solid #e8e8e8"
            background="#fafafa"
          >
            <Text size={400} fontWeight={600}>Tâches en arrière-plan</Text>
          </Pane>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onClose={() => setIsOpen(false)} />
          ))}
          {tasks.length === 0 && (
            <Pane padding={16} textAlign="center">
              <Text size={300} color="#999">Aucune tâche</Text>
            </Pane>
          )}
        </Pane>
      }
    >
      <button
        ref={buttonRef}
        className={`task-center-btn ${hasRunning ? 'task-center-btn--running' : ''}`}
        title={runningTask?.total > 0 ? `${runningTask.progress}/${runningTask.total} entreprises analysées` : 'Tâches en arrière-plan'}
        aria-label="Tâches en arrière-plan"
      >
        {hasRunning ? (
          <Spinner size={16} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )}
        {unreadCount > 0 && (
          <span className="task-center-badge">{unreadCount}</span>
        )}
      </button>
    </Popover>
  );
}
