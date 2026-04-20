/**
 * The locks state tracks whether certain actions are locked or not.
 * This is synced across tabs and windows.
 */
export type RemotingState = {
  sync: boolean;
};

export type RemotingSlice = {
  remoting: RemotingState;

  setRemoting(name: keyof RemotingState, value: boolean): void;
};
