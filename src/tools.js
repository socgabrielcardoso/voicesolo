const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const toolDefinitions = [
  { type: 'function', name: 'current_time', description: 'Consulta a data e a hora reais no fuso configurado no servidor.', strict: true, parameters: object({}) },
  { type: 'function', name: 'calculate', description: 'Executa uma operação aritmética com dois números. Não interpreta código.', strict: true, parameters: object({ operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] }, a: { type: 'number' }, b: { type: 'number' } }) }
];

export function executeTool(name, args, config, now = new Date()) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid tool arguments');
  if (name === 'current_time') {
    if (Object.keys(args).length) throw new Error('Unexpected argument');
    return { iso: now.toISOString(), timeZone: config.timeZone, local: new Intl.DateTimeFormat('pt-BR', { timeZone: config.timeZone, dateStyle: 'full', timeStyle: 'long' }).format(now) };
  }
  if (name === 'calculate') {
    if (Object.keys(args).sort().join(',') !== 'a,b,operation') throw new Error('Unexpected argument');
    const { a, b, operation } = args;
    if (![a, b].every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e12)) throw new Error('Number outside allowed range');
    if (!['add', 'subtract', 'multiply', 'divide'].includes(operation) || (operation === 'divide' && b === 0)) throw new Error('Invalid operation');
    const result = ({ add: () => a + b, subtract: () => a - b, multiply: () => a * b, divide: () => a / b })[operation]();
    return { result };
  }
  throw new Error('Tool not allowed');
}
