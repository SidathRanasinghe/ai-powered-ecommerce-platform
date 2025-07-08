export const logger = {
  log: (str?: any, data?: any, reasonSubject?: any, reason?: any) =>
    console.log(str || "", data || "", reasonSubject || "", reason || ""),
  error: (str?: any, data?: any, reasonSubject?: any, reason?: any) =>
    console.error(str || "", data || "", reasonSubject || "", reason || ""),
  info: (str?: any, data?: any, reasonSubject?: any, reason?: any) =>
    console.info(str || "", data || "", reasonSubject || "", reason || ""),
  warn: (str?: any, data?: any, reasonSubject?: any, reason?: any) =>
    console.warn(str || "", data || "", reasonSubject || "", reason || ""),
};
