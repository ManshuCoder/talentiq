// Mock in-memory database for development when MongoDB is unavailable

const users = new Map();
const sessions = new Map();

// Helper to create a mock document with save method
const createMockDocument = (data, collection) => {
  const doc = Object.assign(Object.create(null), data);
  doc.save = async function() {
    if (this._id) {
      const updated = { ...this, updatedAt: new Date() };
      collection.set(this._id, updated);
      Object.assign(this, updated);
    }
    return this;
  };
  doc.populate = async function(field, select) {
    // Mock populate - populate host and participant if they exist
    // Handle populate("host", "name profileImage email clerkId") format
    // or populate("host") format
    if (typeof field === 'string') {
      if (field === 'host' && this.host) {
        const hostId = typeof this.host === 'object' ? this.host._id || this.host : this.host;
        const hostUser = users.get(hostId?.toString());
        if (hostUser) {
          if (select && typeof select === 'string') {
            const fieldsToSelect = select.split(' ');
            const filteredHost = {};
            fieldsToSelect.forEach(f => {
              if (hostUser[f] !== undefined) filteredHost[f] = hostUser[f];
            });
            this.host = filteredHost;
          } else {
            this.host = hostUser;
          }
        }
      }
      if (field === 'participant' && this.participant) {
        const participantId = typeof this.participant === 'object' ? this.participant._id || this.participant : this.participant;
        const participantUser = users.get(participantId?.toString());
        if (participantUser) {
          if (select && typeof select === 'string') {
            const fieldsToSelect = select.split(' ');
            const filteredParticipant = {};
            fieldsToSelect.forEach(f => {
              if (participantUser[f] !== undefined) filteredParticipant[f] = participantUser[f];
            });
            this.participant = filteredParticipant;
          } else {
            this.participant = participantUser;
          }
        }
      }
    } else if (Array.isArray(field)) {
      // Handle array format
      field.forEach(f => {
        if (f === 'host' && this.host) {
          const hostId = typeof this.host === 'object' ? this.host._id || this.host : this.host;
          this.host = users.get(hostId?.toString()) || this.host;
        }
        if (f === 'participant' && this.participant) {
          const participantId = typeof this.participant === 'object' ? this.participant._id || this.participant : this.participant;
          this.participant = users.get(participantId?.toString()) || this.participant;
        }
      });
    }
    return this;
  };
  return doc;
};

// Create a query builder that supports chaining
const createQueryBuilder = (results) => {
  let queryResults = [...results];
  const builder = {
    populate: function(field, select) {
      // Apply populate to results - can be called multiple times
      queryResults = queryResults.map(session => {
        const populated = { ...session };
        if (field === 'host' && session.host) {
          const hostId = typeof session.host === 'object' ? session.host._id || session.host : session.host;
          const hostUser = users.get(hostId);
          if (hostUser) {
            // If select is provided, filter fields
            if (select) {
              const fields = select.split(' ');
              const filteredHost = {};
              fields.forEach(f => {
                if (hostUser[f] !== undefined) filteredHost[f] = hostUser[f];
              });
              populated.host = filteredHost;
            } else {
              populated.host = hostUser;
            }
          } else {
            populated.host = session.host;
          }
        }
        if (field === 'participant' && session.participant) {
          const participantId = typeof session.participant === 'object' ? session.participant._id || session.participant : session.participant;
          const participantUser = users.get(participantId);
          if (participantUser) {
            // If select is provided, filter fields
            if (select) {
              const fields = select.split(' ');
              const filteredParticipant = {};
              fields.forEach(f => {
                if (participantUser[f] !== undefined) filteredParticipant[f] = participantUser[f];
              });
              populated.participant = filteredParticipant;
            } else {
              populated.participant = participantUser;
            }
          } else {
            populated.participant = session.participant;
          }
        }
        return populated;
      });
      return builder;
    },
    sort: function(sortObj) {
      // Sort results
      const sortKey = Object.keys(sortObj)[0];
      const sortOrder = sortObj[sortKey];
      queryResults.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (sortOrder === -1) {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
      return builder;
    },
    limit: async function(num) {
      return queryResults.slice(0, num).map(s => createMockDocument(s, sessions));
    }
  };
  return builder;
};

export const mockUser = {
  findOne: async (query) => {
    if (query.clerkId) {
      const user = users.get(query.clerkId);
      return user ? createMockDocument(user, users) : null;
    }
    return null;
  },
  create: async (userData) => {
    const user = { 
      _id: Date.now().toString(), 
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    // Store by both clerkId and _id for lookups
    users.set(userData.clerkId, user);
    users.set(user._id, user);
    return createMockDocument(user, users);
  },
  deleteOne: async (query) => {
    if (query.clerkId) {
      users.delete(query.clerkId);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  },
};

export const mockSession = {
  create: async (sessionData) => {
    const session = { 
      _id: Date.now().toString(), 
      status: "active", 
      createdAt: new Date(), 
      updatedAt: new Date(), 
      ...sessionData 
    };
    sessions.set(session._id, session);
    return createMockDocument(session, sessions);
  },
  find: function(query = {}) {
    let results = Array.from(sessions.values());
    
    // Filter by status
    if (query.status) {
      results = results.filter(s => s.status === query.status);
    }
    
    // Handle $or queries (for host or participant)
    if (query.$or) {
      results = results.filter(session => {
        return query.$or.some(condition => {
          if (condition.host) {
            const sessionHostId = typeof session.host === 'object' ? session.host._id || session.host : session.host;
            return sessionHostId?.toString() === condition.host.toString();
          }
          if (condition.participant) {
            const sessionParticipantId = typeof session.participant === 'object' ? session.participant._id || session.participant : session.participant;
            return sessionParticipantId?.toString() === condition.participant.toString();
          }
          return false;
        });
      });
    }
    
    return createQueryBuilder(results);
  },
  findById: async (id) => {
    // Try exact match first
    let session = sessions.get(id);
    if (session) {
      // Populate host and participant references
      const populated = { ...session };
      if (session.host) {
        const hostId = typeof session.host === 'object' ? session.host._id || session.host : session.host;
        const hostUser = users.get(hostId?.toString());
        if (hostUser) {
          populated.host = hostUser;
        }
      }
      if (session.participant) {
        const participantId = typeof session.participant === 'object' ? session.participant._id || session.participant : session.participant;
        const participantUser = users.get(participantId?.toString());
        if (participantUser) {
          populated.participant = participantUser;
        }
      }
      return createMockDocument(populated, sessions);
    }
    // Try to find by string comparison (for timestamps/other IDs)
    for (const [key, value] of sessions.entries()) {
      if (key.toString() === id.toString() || value._id?.toString() === id.toString()) {
        // Populate host and participant references
        const populated = { ...value };
        if (value.host) {
          const hostId = typeof value.host === 'object' ? value.host._id || value.host : value.host;
          const hostUser = users.get(hostId?.toString());
          if (hostUser) {
            populated.host = hostUser;
          }
        }
        if (value.participant) {
          const participantId = typeof value.participant === 'object' ? value.participant._id || value.participant : value.participant;
          const participantUser = users.get(participantId?.toString());
          if (participantUser) {
            populated.participant = participantUser;
          }
        }
        return createMockDocument(populated, sessions);
      }
    }
    return null;
  },
  findByIdAndUpdate: async (id, update) => {
    const session = sessions.get(id);
    if (!session) return null;
    const updated = { ...session, ...update, updatedAt: new Date() };
    sessions.set(id, updated);
    return createMockDocument(updated, sessions);
  },
};

// Helper to populate references
export const populateMockSession = (session) => {
  if (session.host) {
    session.host = users.get(session.host) || session.host;
  }
  if (session.participant) {
    session.participant = users.get(session.participant) || session.participant;
  }
  return session;
};
