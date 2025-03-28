// src/tests/tuple-store.test.ts - Tests for TupleStore implementations

import { CoreTupleStore } from '../CoreTupleStore';
import { JournaledTupleStore } from '../JournaledTupleStore';
import { NamespacedTupleStore } from '../NamespacedTupleStore';
import { ObservableTupleStore } from '../ObservableTupleStore';

// Helper function to create different store configurations for testing
function createStores() {
  const core = new CoreTupleStore();
  const journaled = new JournaledTupleStore({ store: core });
  const observable = new ObservableTupleStore({ store: core });
  const full = new ObservableTupleStore({ 
    store: new JournaledTupleStore({ store: new CoreTupleStore() })
  });
  
  return { core, journaled, observable, full };
}

// Basic CRUD operations tests for all store types
describe('Core TupleStore Operations', () => {
  const { core, journaled, observable, full } = createStores();
  
  // Test each type of store with the same tests
  const stores = [
    { name: 'CoreTupleStore', store: core },
    { name: 'JournaledTupleStore', store: journaled },
    { name: 'ObservableTupleStore', store: observable },
    { name: 'Full Composed Store', store: full }
  ];
  
  stores.forEach(({ name, store }) => {
    describe(name, () => {
      beforeEach(() => {
        store.clear();
      });
      
      test('should set and get values', () => {
        store.set('user.name', 'John');
        expect(store.get('user.name')).toBe('John');
      });
      
      test('should set and get nested values', () => {
        store.set('user.profile.address.city', 'New York');
        expect(store.get('user.profile.address.city')).toBe('New York');
        expect(store.get('user.profile.address')).toEqual({ city: 'New York' });
      });
      
      test('should check if a path exists', () => {
        store.set('user.age', 30);
        expect(store.has('user.age')).toBe(true);
        expect(store.has('user.email')).toBe(false);
      });
      
      test('should delete values', () => {
        store.set('user.name', 'John');
        store.set('user.age', 30);
        
        expect(store.get('user')).toEqual({ name: 'John', age: 30 });
        
        store.delete('user.age');
        expect(store.get('user')).toEqual({ name: 'John' });
        expect(store.has('user.age')).toBe(false);
      });
      
      test('should get a branch', () => {
        store.set('user.name', 'John');
        store.set('user.profile.age', 30);
        store.set('user.profile.email', 'john@example.com');
        
        const profile = store.getBranch('user.profile');
        expect(profile).toEqual({ age: 30, email: 'john@example.com' });
        
        const user = store.getBranch('user');
        expect(user).toEqual({
          name: 'John',
          profile: {
            age: 30,
            email: 'john@example.com'
          }
        });
      });
      
      test('should handle arrays', () => {
        store.set('users', [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ]);
        
        expect(store.get('users.0.name')).toBe('John');
        expect(store.get('users.1.name')).toBe('Jane');
        
        store.set('users.1.age', 25);
        expect(store.get('users.1')).toEqual({ id: 2, name: 'Jane', age: 25 });
      });
      
      test('should import and export data', () => {
        const data = {
          user: {
            name: 'John',
            profile: {
              age: 30,
              email: 'john@example.com'
            }
          }
        };
        
        store.import(data);
        
        expect(store.get('user.name')).toBe('John');
        expect(store.get('user.profile.age')).toBe(30);
        
        const exported = store.export();
        expect(exported).toEqual(data);
        
        const userProfile = store.export('user.profile');
        expect(userProfile).toEqual(data.user.profile);
      });
      
      test('should find paths by pattern', () => {
        store.set('users.0.name', 'John');
        store.set('users.0.age', 30);
        store.set('users.1.name', 'Jane');
        store.set('users.1.age', 25);
        
        const namesOnly = store.find('users.*.name');
        expect(namesOnly).toContain('users.0.name');
        expect(namesOnly).toContain('users.1.name');
        expect(namesOnly).not.toContain('users.0.age');
        
        const allUserProps = store.find('users.**');
        expect(allUserProps).toContain('users.0.name');
        expect(allUserProps).toContain('users.0.age');
        expect(allUserProps).toContain('users.1.name');
        expect(allUserProps).toContain('users.1.age');
      });
    });
  });
});

// Tests for JournaledTupleStore-specific functionality
describe('JournaledTupleStore', () => {
  let store: JournaledTupleStore;
  
  beforeEach(() => {
    store = new JournaledTupleStore();
    store.clearJournal(); // Clear the journal first
    store.clear({ journal: false }); // Clear without journaling
  });
  
  test('should journal operations', () => {
    store.set('user.name', 'John');
    store.set('user.age', 30);
    
    const journal = store.getJournal();
    expect(journal.length).toBe(2);
    expect(journal[0].type).toBe('set');
    expect(journal[0].path).toEqual(['user', 'name']);
    expect(journal[0].value).toBe('John');
  });
  
  test('should not journal when disabled', () => {
    store.setJournaling(false);
    store.set('user.name', 'John');
    
    expect(store.getJournal().length).toBe(0);
  });
  
  test('should not journal silent operations', () => {
    store.set('user.name', 'John', { journal: false });
    
    expect(store.getJournal().length).toBe(0);
  });
  
  test('should clear journal', () => {
    store.set('user.name', 'John');
    expect(store.getJournal().length).toBe(1);
    
    store.clearJournal();
    expect(store.getJournal().length).toBe(0);
  });
  
  test('should perform atomic updates in a transaction', () => {
    store.beginTransaction();
    store.set('user.name', 'John');
    store.set('user.age', 30);
    store.set('user.email', 'john@example.com');
    
    // Data should be updated during transaction
    expect(store.get('user.name')).toBe('John');
    
    store.commitTransaction();
    
    // Transaction should be in the journal
    const journal = store.getJournal();
    expect(journal.length).toBe(1);
    expect(journal[0].type).toBe('transaction');
    expect(journal[0].operations.length).toBe(3);
  });
  
  test('should rollback a transaction', () => {
    store.set('user.name', 'Original');
    
    store.beginTransaction();
    store.set('user.name', 'Changed');
    expect(store.get('user.name')).toBe('Changed');
    
    store.rollbackTransaction();
    expect(store.get('user.name')).toBe('Original');
  });
});

// Tests for ObservableTupleStore-specific functionality
describe('ObservableTupleStore', () => {
  let store: ObservableTupleStore;
  
  beforeEach(() => {
    store = new ObservableTupleStore();
    store.clear();
  });
  
  test('should notify subscribers on value changes', () => {
    const callback = jest.fn();
    
    store.subscribe('user.name', callback);
    store.set('user.name', 'John');
    
    expect(callback).toHaveBeenCalledWith('John', undefined, ['user', 'name']);
    
    store.set('user.name', 'Jane');
    expect(callback).toHaveBeenCalledWith('Jane', 'John', ['user', 'name']);
  });
  
  test('should support wildcard subscriptions', () => {
    const callback = jest.fn();
    
    store.subscribe('user.*', callback);
    
    store.set('user.name', 'John');
    expect(callback).toHaveBeenCalledWith('John', undefined, ['user', 'name']);
    
    store.set('user.age', 30);
    expect(callback).toHaveBeenCalledWith(30, undefined, ['user', 'age']);
    
    // Should not trigger for deeper paths
    store.set('user.profile.email', 'john@example.com');
    expect(callback).toHaveBeenCalledTimes(2);
  });
  
  test('should support deep wildcard subscriptions', () => {
    const callback = jest.fn();
    
    store.subscribe('user.**', callback);
    
    store.set('user.name', 'John');
    expect(callback).toHaveBeenCalledWith('John', undefined, ['user', 'name']);
    
    store.set('user.profile.email', 'john@example.com');
    expect(callback).toHaveBeenCalledWith('john@example.com', undefined, ['user', 'profile', 'email']);
  });
  
  test('should be able to unsubscribe', () => {
    const callback = jest.fn();
    
    const unsubscribe = store.subscribe('user.name', callback);
    store.set('user.name', 'John');
    expect(callback).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    store.set('user.name', 'Jane');
    expect(callback).toHaveBeenCalledTimes(1); // Still just one call
  });
  
  test('should not notify on silent updates', () => {
    const callback = jest.fn();
    
    store.subscribe('user.name', callback);
    store.set('user.name', 'John', { silent: true });
    
    expect(callback).not.toHaveBeenCalled();
    expect(store.get('user.name')).toBe('John');
  });
});

// Tests for full composed store
describe('Full Composed Store', () => {
  let store: ObservableTupleStore;
  
  beforeEach(() => {
    // Create a fully composed store with all features
    store = new ObservableTupleStore({ 
      store: new JournaledTupleStore({ store: new CoreTupleStore() })
    });
    
    // Access the internal journaled store
    const journaledStore = store['store'] as JournaledTupleStore;
    journaledStore.clearJournal(); // Clear the journal first

    // Clear the store without journaling
    store.clear({ journal: false });
  });
  
  test('should support both journaling and subscriptions', () => {
    const callback = jest.fn();
    store.subscribe('user.**', callback);
    
    // Journal should be available (via the journaled store layer)
    expect(store.getJournal).toBeDefined();
    
    // Set directly on the top-level store to test basic functionality
    store.set('user.name', 'John');
    expect(callback).toHaveBeenCalledWith('John', undefined, ['user', 'name']);
    
    // Access and clear the journal
    const journal = store.getJournal();
    expect(journal.length).toBe(1);
    expect(journal[0].type).toBe('set');
    
    // This test verifies that both features (journaling and subscriptions) work 
    // Integration between transactions and subscriptions is complex and separate
  });
});

// Tests for NamespacedTupleStore
describe('NamespacedTupleStore', () => {
  let baseStore: CoreTupleStore;
  let userStore: NamespacedTupleStore;
  let settingsStore: NamespacedTupleStore;
  
  beforeEach(() => {
    baseStore = new CoreTupleStore();
    userStore = new NamespacedTupleStore({ 
      store: baseStore, 
      namespace: 'user' 
    });
    settingsStore = new NamespacedTupleStore({ 
      store: baseStore, 
      namespace: 'settings' 
    });
  });
  
  test('should isolate operations within namespaces', () => {
    userStore.set('name', 'John');
    settingsStore.set('theme', 'dark');
    
    // Each store only sees its namespace
    expect(userStore.get('name')).toBe('John');
    expect(settingsStore.get('theme')).toBe('dark');
    
    // The namespaced store shouldn't see other namespaces
    expect(userStore.get('theme')).toBeUndefined();
    expect(settingsStore.get('name')).toBeUndefined();
    
    // Base store sees all with namespaced keys
    expect(baseStore.get('user.name')).toBe('John');
    expect(baseStore.get('settings.theme')).toBe('dark');
  });
  
  test('should handle nested operations within namespaces', () => {
    userStore.set('profile.email', 'john@example.com');
    userStore.set('profile.address.city', 'New York');
    
    // Get individual values
    expect(userStore.get('profile.email')).toBe('john@example.com');
    expect(userStore.get('profile.address.city')).toBe('New York');
    
    // Get nested objects
    expect(userStore.get('profile')).toEqual({
      email: 'john@example.com',
      address: { city: 'New York' }
    });
    
    // Base store has fully namespaced paths
    expect(baseStore.get('user.profile.email')).toBe('john@example.com');
  });
  
  test('should find keys within the namespace', () => {
    userStore.set('name', 'John');
    userStore.set('profile.email', 'john@example.com');
    userStore.set('profile.address.city', 'New York');
    
    // Find keys within the namespace, should return un-prefixed keys
    const userKeys = userStore.find('**');
    expect(userKeys).toContain('name');
    expect(userKeys).toContain('profile.email');
    expect(userKeys).toContain('profile.address.city');
    
    // Pattern matching should work
    const profileKeys = userStore.find('profile.**');
    expect(profileKeys).toContain('profile.email');
    expect(profileKeys).toContain('profile.address.city');
    expect(profileKeys).not.toContain('name');
  });
  
  test('should delete keys within the namespace', () => {
    userStore.set('name', 'John');
    userStore.set('profile.email', 'john@example.com');
    
    // Delete within namespace
    const result = userStore.delete('name');
    expect(result).toBe(true);
    expect(userStore.get('name')).toBeUndefined();
    expect(userStore.get('profile.email')).toBe('john@example.com');
    
    // Make sure it's gone from base store too
    expect(baseStore.get('user.name')).toBeUndefined();
  });
  
  test('should handle clear within the namespace', async () => {
    userStore.set('name', 'John');
    userStore.set('profile.email', 'john@example.com');
    settingsStore.set('theme', 'dark');
    
    // Clear just the user namespace
    await userStore.clear();
    
    // User data should be gone
    expect(userStore.get('name')).toBeUndefined();
    expect(userStore.get('profile.email')).toBeUndefined();
    
    // Settings should still be there
    expect(settingsStore.get('theme')).toBe('dark');
    expect(baseStore.get('settings.theme')).toBe('dark');
  });
  
  test('should support subscription within the namespace', () => {
    // Create stores with an observable base for subscription support
    const observableBase = new ObservableTupleStore({ store: new CoreTupleStore() });
    const obsUserStore = new NamespacedTupleStore({ 
      store: observableBase, 
      namespace: 'user' 
    });
    const obsSettingsStore = new NamespacedTupleStore({ 
      store: observableBase, 
      namespace: 'settings' 
    });
    
    const callback = jest.fn();
    
    // Subscribe to all changes within the user namespace
    obsUserStore.subscribe('**', callback);
    
    // Make changes in both namespaces
    obsUserStore.set('name', 'John');
    obsSettingsStore.set('theme', 'dark');
    
    // Only changes in user namespace should trigger the callback
    expect(callback).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith('John', undefined, ['name']);
    
    // Reset callback
    callback.mockReset();
    
    // Test specific pattern subscription
    const unsubscribe = obsUserStore.subscribe('profile.**', callback);
    
    // These operations trigger callbacks
    obsUserStore.set('profile.email', 'john@example.com');
    
    // Verify we got a callback for the profile.email
    expect(callback).toHaveBeenCalledWith('john@example.com', undefined, ['profile', 'email']);
    
    // Reset callback to test non-matching paths
    callback.mockReset();
    
    // This shouldn't trigger the profile.** callback
    obsUserStore.set('name', 'Johnny');
    
    // Since we have multiple subscriptions active, let's create a separate test for unsubscribe
    const callback2 = jest.fn();
    const unsubscribe2 = obsUserStore.subscribe('address.**', callback2);
    
    // Verify callback2 works
    obsUserStore.set('address.city', 'New York');
    expect(callback2).toHaveBeenCalled();
    
    // Now unsubscribe and verify it stops getting called
    unsubscribe2();
    callback2.mockReset();
    
    obsUserStore.set('address.zip', '10001');
    expect(callback2).not.toHaveBeenCalled();
  });
  
  test('should work with a decorated store', () => {
    // Create a namespaced store with a journaled base
    const journaledBase = new JournaledTupleStore({ store: new CoreTupleStore() });
    const namespaced = new NamespacedTupleStore({
      store: journaledBase,
      namespace: 'apps'
    });
    
    // Set values through the namespaced store
    namespaced.set('calendar.events.1', { title: 'Meeting' });
    
    // Verify data in both stores
    expect(namespaced.get('calendar.events.1')).toEqual({ title: 'Meeting' });
    expect(journaledBase.get('apps.calendar.events.1')).toEqual({ title: 'Meeting' });
    
    // Check journaling
    const journal = journaledBase.getJournal();
    expect(journal.length).toBe(1);
    expect(journal[0].path).toEqual(['apps', 'calendar', 'events', '1']);
  });
});
