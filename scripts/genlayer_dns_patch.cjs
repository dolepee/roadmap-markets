const dns = require("node:dns");

const TARGET_HOST = "studio.genlayer.com";
const FALLBACK_IP = "104.21.53.84";

const originalLookup = dns.lookup.bind(dns);

function normalizeCallback(options, callback) {
  if (typeof options === "function") {
    return { options: {}, callback: options };
  }
  return { options: options || {}, callback };
}

dns.lookup = function patchedLookup(hostname, options, callback) {
  const normalized = normalizeCallback(options, callback);
  if (hostname !== TARGET_HOST) {
    return originalLookup(hostname, options, callback);
  }

  return originalLookup(hostname, options, (error, address, family) => {
    if (!error) {
      normalized.callback(null, address, family);
      return;
    }

    const resolvedFamily = normalized.options.family || 4;
    if (normalized.options.all) {
      normalized.callback(null, [{ address: FALLBACK_IP, family: resolvedFamily }]);
      return;
    }
    normalized.callback(null, FALLBACK_IP, resolvedFamily);
  });
};

if (dns.promises && typeof dns.promises.lookup === "function") {
  const originalPromisesLookup = dns.promises.lookup.bind(dns.promises);
  dns.promises.lookup = async function patchedPromisesLookup(hostname, options = {}) {
    if (hostname !== TARGET_HOST) {
      return originalPromisesLookup(hostname, options);
    }

    try {
      return await originalPromisesLookup(hostname, options);
    } catch (error) {
      if (options && options.all) {
        return [{ address: FALLBACK_IP, family: 4 }];
      }
      return { address: FALLBACK_IP, family: 4 };
    }
  };
}
