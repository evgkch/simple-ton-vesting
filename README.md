# Документация по смарт-контрактам вестинга

## Архитектура системы

### Контракты
- **Vesting Deployer** - фабрика для создания контрактов вестинга
- **Vesting Item** - индивидуальный контракт вестинга (развертывается как библиотека в мастерчейне)

## Схема сообщений

### Развертывание библиотеки кода
```
User → Librarian: deploy(code)
    Librarian → Masterchain: set_lib_code(code, 2)  // публичная библиотека
```

### Создание контракта вестинга
```
User → VestingDeployer: deploy(sender, library_code, vesting_data)
    VestingDeployer → VestingDeployer: _ensure_data_ok(data)
    VestingDeployer → VestingDeployer: raw_reserve(amount)
    VestingDeployer → NewContract: set_code(library_code) + set_data(vesting_data)
```

### Вывод средств
```
Beneficiary → VestingItem: claim()
    VestingItem → VestingItem: get_avaliable_amount_to_withdraw()
    VestingItem → VestingItem: raw_reserve(remaining)
    VestingItem → Beneficiary: _send_withdraw()
```

## Управление библиотечным кодом

Vesting Item уже развернута как публичная библиотека в мастерчейне

```bash
# Развертывание библиотеки
npm start deployVestingItemLibrary

# Создание контракта вестинга
npm start deployVesting

# Управление существующим контрактом
npm start vestingController
```

## Формула расчета
```
available = (unlockable_amount * min(duration, now - start_time) / duration) - released_amount
```

**Код покрыт тестами** - включает валидацию параметров, расчеты и авторизацию.
