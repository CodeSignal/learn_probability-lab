// WebSocket connection management
// Handles connection, reconnection, and message handling

let websocket = null;

export function initializeWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws`;

  try {
    websocket = new WebSocket(wsUrl);

    websocket.onopen = function(event) {
      console.log('WebSocket connected');
    };

    websocket.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message' && data.message) {
          alert(data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = function(event) {
      console.log('WebSocket disconnected');

      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        initializeWebSocket();
      }, 3000);
    };

    websocket.onerror = function(error) {
      console.error('WebSocket error:', error);
    };

  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
  }
}

