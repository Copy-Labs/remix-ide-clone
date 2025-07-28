import { debug } from '@/services/loggerService';

/**
 * Interface for an entity with an ID
 */
export interface Entity {
  id: string | number;
  [key: string]: any;
}

/**
 * Interface for normalized entities
 */
export interface NormalizedEntities<T extends Entity = Entity> {
  byId: Record<string | number, T>;
  allIds: Array<string | number>;
}

/**
 * Interface for a normalized state
 */
export interface NormalizedState {
  [entityType: string]: NormalizedEntities;
}

/**
 * Normalize an array of entities
 * @param entities Array of entities to normalize
 * @returns Normalized entities
 */
export function normalizeEntities<T extends Entity>(entities: T[]): NormalizedEntities<T> {
  const byId: Record<string | number, T> = {};
  const allIds: Array<string | number> = [];

  entities.forEach((entity) => {
    byId[entity.id] = { ...entity };
    allIds.push(entity.id);
  });

  return { byId, allIds };
}

/**
 * Denormalize entities back to an array
 * @param normalizedEntities Normalized entities
 * @returns Array of entities
 */
export function denormalizeEntities<T extends Entity>(
  normalizedEntities: NormalizedEntities<T>,
): T[] {
  return normalizedEntities.allIds.map((id) => normalizedEntities.byId[id]);
}

/**
 * Add an entity to normalized entities
 * @param normalizedEntities Normalized entities
 * @param entity Entity to add
 * @returns Updated normalized entities
 */
export function addEntity<T extends Entity>(
  normalizedEntities: NormalizedEntities<T>,
  entity: T,
): NormalizedEntities<T> {
  // Check if entity already exists
  const exists = normalizedEntities.allIds.includes(entity.id);

  return {
    byId: {
      ...normalizedEntities.byId,
      [entity.id]: { ...entity },
    },
    allIds: exists ? normalizedEntities.allIds : [...normalizedEntities.allIds, entity.id],
  };
}

/**
 * Update an entity in normalized entities
 * @param normalizedEntities Normalized entities
 * @param entity Entity to update
 * @returns Updated normalized entities
 */
export function updateEntity<T extends Entity>(
  normalizedEntities: NormalizedEntities<T>,
  entity: Partial<T> & { id: string | number },
): NormalizedEntities<T> {
  // Check if entity exists
  if (!normalizedEntities.byId[entity.id]) {
    debug('StateNormalization', `Entity with id ${entity.id} not found for update`);
    return normalizedEntities;
  }

  return {
    ...normalizedEntities,
    byId: {
      ...normalizedEntities.byId,
      [entity.id]: {
        ...normalizedEntities.byId[entity.id],
        ...entity,
      },
    },
  };
}

/**
 * Remove an entity from normalized entities
 * @param normalizedEntities Normalized entities
 * @param id ID of entity to remove
 * @returns Updated normalized entities
 */
export function removeEntity<T extends Entity>(
  normalizedEntities: NormalizedEntities<T>,
  id: string | number,
): NormalizedEntities<T> {
  // Check if entity exists
  if (!normalizedEntities.byId[id]) {
    debug('StateNormalization', `Entity with id ${id} not found for removal`);
    return normalizedEntities;
  }

  const { [id]: removed, ...restById } = normalizedEntities.byId;

  return {
    byId: restById,
    allIds: normalizedEntities.allIds.filter((entityId) => entityId !== id),
  };
}

/**
 * Create empty normalized entities
 * @returns Empty normalized entities
 */
export function createEmptyNormalizedEntities<T extends Entity>(): NormalizedEntities<T> {
  return {
    byId: {},
    allIds: [],
  };
}

/**
 * Select an entity by ID
 * @param normalizedEntities Normalized entities
 * @param id ID of entity to select
 * @returns Entity or undefined if not found
 */
export function selectEntityById<T extends Entity>(
  normalizedEntities: NormalizedEntities<T>,
  id: string | number,
): T | undefined {
  return normalizedEntities.byId[id];
}

/**
 * Select entities by IDs
 * @param normalizedEntities Normalized entities
 * @param ids IDs of entities to select
 * @returns Array of entities
 */
export function selectEntitiesByIds<T extends Entity>(
  normalizedEntities: NormalizedEntities<T>,
  ids: Array<string | number>,
): T[] {
  return ids
    .map((id) => normalizedEntities.byId[id])
    .filter((entity) => entity !== undefined) as T[];
}

/**
 * Select all entities
 * @param normalizedEntities Normalized entities
 * @returns Array of all entities
 */
export function selectAllEntities<T extends Entity>(
  normalizedEntities: NormalizedEntities<T>,
): T[] {
  return denormalizeEntities(normalizedEntities);
}

/**
 * Filter entities by predicate
 * @param normalizedEntities Normalized entities
 * @param predicate Predicate function to filter entities
 * @returns Array of filtered entities
 */
export function filterEntities<T extends Entity>(
  normalizedEntities: NormalizedEntities<T>,
  predicate: (entity: T) => boolean,
): T[] {
  return selectAllEntities(normalizedEntities).filter(predicate);
}

/**
 * Example usage:
 *
 * // Define your entity type
 * interface User extends Entity {
 *   name: string;
 *   email: string;
 * }
 *
 * // In your store
 * interface UserState {
 *   users: NormalizedEntities<User>;
 *   loading: boolean;
 *   error: string | null;
 * }
 *
 * const initialState: UserState = {
 *   users: createEmptyNormalizedEntities<User>(),
 *   loading: false,
 *   error: null
 * };
 *
 * const useUserStore = create<UserState & UserActions>()(
 *   immer((set, get) => ({
 *     ...initialState,
 *
 *     // Actions
 *     addUser: (user: User) => set(state => {
 *       state.users = addEntity(state.users, user);
 *     }),
 *
 *     updateUser: (user: Partial<User> & { id: string | number }) => set(state => {
 *       state.users = updateEntity(state.users, user);
 *     }),
 *
 *     removeUser: (id: string | number) => set(state => {
 *       state.users = removeEntity(state.users, id);
 *     }),
 *
 *     // Selectors can be defined as methods in the store
 *     getUserById: (id: string | number) => selectEntityById(get().users, id),
 *     getAllUsers: () => selectAllEntities(get().users)
 *   }))
 * );
 */
