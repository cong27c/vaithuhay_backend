const { Queue } = require("@/models");

async function dispatch(type, payload) {
  const newQueue = {
    type,
    payload: payload,
  };
  await Queue.create(newQueue);
}

module.exports = {
  dispatch,
};
