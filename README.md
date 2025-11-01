# Документация по смарт-контрактам вестинга

## Архитектура системы

### 1. Vesting Deployer
**Фабрика для развертывания контрактов вестинга**

**Функции**:
- Создание контрактов вестинга
- Валидация параметров
- Резервирование средств

**Параметры**:
- `beneficiary_address` - адрес получателя
- `unlockable_amount` - сумма вестинга (> 0)
- `start_time` - время начала
- `duration` - продолжительность (> 0)
- `period` - период распределения (> 0)
- `cliff_period` - cliff-период (< duration)

### 2. Vesting Item
**Индивидуальный контракт вестинга**

**Методы**:
- `claim()` - вывод средств (только beneficiary)
- `get_avaliable_amount_to_withdraw()` - проверка доступной суммы
- `get_contract_data()` - данные контракта

## Механика вестинга

### Формула расчета:
```
dt = min(duration, max(0, now - start_time))
passed_steps = dt / period
total_steps = duration / period
progress_amount = unlockable_amount * passed_steps / total_steps
available_amount = max(0, progress_amount - released_amount)
```

## Скрипты управления

### Развертывание системы
```bash
npm start deployVesting
```
- Создание фабрики VestingDeployer
- Интерактивное создание контракта вестинга
- Резервирование средств

### Управление контрактом
```bash
npm start vestingController
```
- Просмотр данных контракта
- Проверка доступной суммы
- Вывод средств (claim)

## Тестирование

**Код полностью покрыт тестами**
```bash
npm test
```

Тесты включают валидацию параметров, расчеты доступных средств, авторизацию и интеграционные тесты.
