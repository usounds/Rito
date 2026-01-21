export default new Proxy({}, {
    get: (target, prop) => prop,
});
