# Простой план исправления

## Проблема 1: Форма контакта (ПРОСТОЕ РЕШЕНИЕ)

**Это НЕ проблема кода!** Это проблема базы данных.

### Что сделать:
1. Откройте Supabase: https://supabase.com/dashboard
2. SQL Editor → New query
3. Скопируйте SQL из файла `add_contact_requests_table.sql`
4. Нажмите Run
5. Готово! Форма заработает.

**Время: 2 минуты**

---

## Проблема 2: Прокрутка wheel (НУЖНО УПРОСТИТЬ)

### Текущая проблема:
- Слишком сложная реализация с Pointer Events
- Возможный конфликт обработчиков
- Непонятно, что именно не работает

### Простое решение:

**Вариант А: Упростить wheel обработчик**

Убрать все сложности, оставить только базовую логику:

```typescript
const handleWheel = (e: React.WheelEvent) => {
  e.preventDefault();
  if (animating) return;
  
  const columnsPerRow = 3;
  const threshold = 50; // Минимальная прокрутка
  
  if (Math.abs(e.deltaY) < threshold) return;
  
  if (e.deltaY > 0) {
    // Прокрутка вниз
    const newIndex = index + columnsPerRow;
    if (newIndex < photos.length) {
      handleIndexChange(newIndex);
    }
  } else {
    // Прокрутка вверх
    const newIndex = index - columnsPerRow;
    if (newIndex >= 0) {
      handleIndexChange(newIndex);
    }
  }
};
```

**Вариант Б: Временно отключить Pointer Events для wheel**

Если Pointer Events мешают, можно временно отключить их для wheel событий.

**Вариант В: Использовать только wheel, без Pointer Events для вертикали**

Убрать вертикальную навигацию через Pointer Events, оставить только wheel.

---

## Рекомендация

### Шаг 1: Исправить форму (2 минуты)
- Выполнить SQL в Supabase
- Проверить работу

### Шаг 2: Упростить wheel (10 минут)
- Взять простой код выше
- Заменить текущий handleWheel
- Протестировать

### Шаг 3: Если не работает
- Открыть консоль браузера (F12)
- Проверить ошибки
- Добавить console.log для отладки

---

## Если ничего не помогает

1. **Создать новую ветку:**
   ```bash
   git checkout -b fix/simple-wheel
   ```

2. **Упростить код:**
   - Убрать сложную логику Pointer Events для вертикали
   - Оставить только wheel
   - Протестировать

3. **Если работает:**
   - Смержить в main
   - Добавить Pointer Events позже, если нужно

---

## Вопросы для диагностики

1. **Форма:**
   - Выполнили SQL в Supabase? (Да/Нет)
   - Если да, какая ошибка сейчас?

2. **Wheel:**
   - На каком устройстве тестируете? (Windows/Mac/Мобильный)
   - Есть ли ошибки в консоли? (F12 → Console)
   - Срабатывает ли обработчик вообще? (добавить console.log)

---

## Минимальный тест для wheel

Добавьте в handleWheel в самое начало:

```typescript
const handleWheel = (e: React.WheelEvent) => {
  console.log('Wheel event!', e.deltaY); // ОТЛАДКА
  e.preventDefault();
  // ... остальной код
};
```

Если в консоли ничего не появляется - обработчик не срабатывает.
Если появляется - проблема в логике.

