/**
 * BellePoule Modern - Conflict Resolution Utilities
 * Handles resolution of conflicting data when syncing offline actions
 * Licensed under GPL-3.0
 */

export interface ConflictResolutionResult<T> {
  resolved: T;
  wasConflict: boolean;
  resolution: 'local' | 'remote' | 'merged';
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  conflicts: number;
  errors: string[];
}

export function resolveConflict<T extends { updatedAt?: Date }>(
  local: T | null,
  remote: T | null
): ConflictResolutionResult<T> {
  if (!local && !remote) {
    return { resolved: null as unknown as T, wasConflict: false, resolution: 'local' };
  }
  if (!local) return { resolved: remote!, wasConflict: false, resolution: 'remote' };
  if (!remote) return { resolved: local, wasConflict: false, resolution: 'local' };

  const localTime = local.updatedAt?.getTime() || 0;
  const remoteTime = remote.updatedAt?.getTime() || 0;

  if (localTime === remoteTime) {
    return { resolved: local, wasConflict: false, resolution: 'local' };
  }

  return {
    resolved: localTime > remoteTime ? local : remote,
    wasConflict: true,
    resolution: localTime > remoteTime ? 'local' : 'remote',
  };
}

export function mergeActionsById<T extends { id: string; updatedAt?: Date }>(
  localActions: T[],
  remoteActions: T[]
): T[] {
  const actionMap = new Map<string, T>();

  for (const action of localActions) {
    actionMap.set(action.id, action);
  }

  for (const action of remoteActions) {
    const existing = actionMap.get(action.id);
    if (!existing) {
      actionMap.set(action.id, action);
    } else {
      const localTime = existing.updatedAt?.getTime() || 0;
      const remoteTime = action.updatedAt?.getTime() || 0;
      if (remoteTime > localTime) {
        actionMap.set(action.id, action);
      }
    }
  }

  return Array.from(actionMap.values());
}

export interface ConflictDetection<T extends { id: string }> {
  localOnly: T[];
  remoteOnly: T[];
  conflicted: { local: T; remote: T }[];
}

export function detectConflicts<T extends { id: string; updatedAt?: Date }>(
  local: T[],
  remote: T[]
): ConflictDetection<T> {
  const localMap = new Map(local.map(item => [item.id, item]));
  const remoteMap = new Map(remote.map(item => [item.id, item]));

  const localOnly: T[] = [];
  const remoteOnly: T[] = [];
  const conflicted: { local: T; remote: T }[] = [];

  for (const [id, localItem] of localMap) {
    const remoteItem = remoteMap.get(id);
    if (!remoteItem) {
      localOnly.push(localItem);
    } else {
      const hasConflict = localItem.updatedAt?.getTime() !== remoteItem.updatedAt?.getTime();
      if (hasConflict) {
        conflicted.push({ local: localItem, remote: remoteItem });
      }
    }
  }

  for (const [id, remoteItem] of remoteMap) {
    if (!localMap.has(id)) {
      remoteOnly.push(remoteItem);
    }
  }

  return { localOnly, remoteOnly, conflicted };
}
