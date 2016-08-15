// Don't pollute the global namespace, keep the socket on a "private" path.
export const SOCKET_PATH = '__webpack_udev/ipc';

// Namespace for client comm.
export const CLIENT_NS = '/client';

// Namespace for compiler comm.
export const COMPILER_NS = '/compiler';

// Namespace for render comm.
export const RENDER_NS = '/render';
