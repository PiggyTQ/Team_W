export const businessError=(code,status=400,extra={})=>Object.assign(new Error(code),{code,status,...extra});
