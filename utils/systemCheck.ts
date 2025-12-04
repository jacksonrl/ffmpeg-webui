export const checkSystemCapabilities = () => {
  const nav = navigator as any;
  const memory = nav.deviceMemory || 4; // Default to 4GB if API unsupported
  const threads = nav.hardwareConcurrency || 4;

  console.log(`System Check: ~${memory}GB RAM, ${threads} Logical Cores`);

  if (memory < 4) {
    alert("Warning: Your device has low memory (approx " + memory + "GB). Video conversion might fail.");
  }
};