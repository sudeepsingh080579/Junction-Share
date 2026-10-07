import { screenAfterBack } from '../back';

describe('screenAfterBack', () => {
  test('leaves the app only from home', () => {
    expect(screenAfterBack('home', 'home')).toBeNull();
  });

  test('create and inbox return home', () => {
    expect(screenAfterBack('create', 'home')).toBe('home');
    expect(screenAfterBack('inbox', 'home')).toBe('home');
  });

  test('match returns to the inbox', () => {
    expect(screenAfterBack('match', 'home')).toBe('inbox');
  });

  test('profile returns to the screen that opened it', () => {
    expect(screenAfterBack('profile', 'create')).toBe('create');
    expect(screenAfterBack('profile', 'home')).toBe('home');
  });
});
