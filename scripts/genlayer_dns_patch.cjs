const dns = require("node:dns");

const HOST_FALLBACKS = {
  "studio.genlayer.com": "104.21.53.84",
  "rpc-bradbury.genlayer.com": "104.21.53.84",
};

const originalLookup = dns.lookup.bind(dns);

function normalizeCallback(options, callback) {
  if (typeof options === "function") {
    return { options: {}, callback: options };
  }
  return { options: options || {}, callback };
}

dns.lookup = function patchedLookup(hostname, options, callback) {
  const normalized = normalizeCallback(options, callback);
  const fallbackIp = HOST_FALLBACKS[hostname];
  if (!fallbackIp) {
    return originalLookup(hostname, options, callback);
  }

  const forcedOptions = { ...normalized.options, family: normalized.options.family || 4 };
  return originalLookup(hostname, forcedOptions, (error, address, family) => {
    if (!error) {
      normalized.callback(null, address, family);
      return;
    }

    const resolvedFamily = forcedOptions.family || 4;
    if (normalized.options.all) {
      normalized.callback(null, [{ address: fallbackIp, family: resolvedFamily }]);
      return;
    }
    normalized.callback(null, fallbackIp, resolvedFamily);
  });
};

if (dns.promises && typeof dns.promises.lookup === "function") {
  const originalPromisesLookup = dns.promises.lookup.bind(dns.promises);
  dns.promises.lookup = async function patchedPromisesLookup(hostname, options = {}) {
    const fallbackIp = HOST_FALLBACKS[hostname];
    if (!fallbackIp) {
      return originalPromisesLookup(hostname, options);
    }

    const forcedOptions = { ...options, family: options.family || 4 };
    try {
      return await originalPromisesLookup(hostname, forcedOptions);
    } catch (error) {
      if (forcedOptions && forcedOptions.all) {
        return [{ address: fallbackIp, family: 4 }];
      }
      return { address: fallbackIp, family: 4 };
    }
  };
}
