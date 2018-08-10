

class SyncAgent {

  constructor(ctx) {
    this.init = ctx !== undefined;
  }

  sendUserUpdateMessages(messages) {
    return Promise.resolve(messages);
  }
}


module.exports = SyncAgent;