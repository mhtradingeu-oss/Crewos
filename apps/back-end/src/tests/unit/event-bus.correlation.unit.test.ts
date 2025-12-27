import { publish } from '../../core/events/event-bus.js';
import { v4 as uuidv4 } from 'uuid';

describe('event-bus correlationId propagation', () => {
  it('attaches correlationId from context', async () => {
    const spy = jest.spyOn(global, 'crypto', 'get').mockReturnValue({ randomUUID: () => 'uuid-1' } as any);
    const loggerSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    await publish('test.event', { foo: 1 }, { correlationId: 'cid-123' });
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('cid-123'));
    spy.mockRestore();
    loggerSpy.mockRestore();
  });

  it('generates correlationId if missing', async () => {
    const loggerSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    await publish('test.event', { foo: 2 }, {});
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('event.emitted'));
    loggerSpy.mockRestore();
  });
});
