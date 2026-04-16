import { useEffect, useState } from 'react';
import './App.css';
import { MetersPagination } from './components/MetersPagination';
import { MetersTable } from './components/MetersTable';
import { useStoreRerender } from './hooks/useStoreRerender';
import { createRootStore } from './store';

function App() {
  const [store] = useState(() => createRootStore());
  useStoreRerender(store);

  useEffect(() => {
    void store.fetchPage(0);
  }, [store]);

  const currentPage = Math.floor(store.offset / store.limit) + 1;
  const totalPages = store.total
    ? Math.max(1, Math.ceil(store.total / store.limit))
    : currentPage;

  const onOpenPage = (page: number) => {
    void store.fetchPage((page - 1) * store.limit);
  };

  return (
    <main className="page">
      <section className="panel">
        <h1>Список счётчиков</h1>

        {store.error ? (
          <div className="error">Ошибка: {store.error}</div>
        ) : null}

        <MetersTable store={store} />

        <MetersPagination
          currentPage={currentPage}
          totalPages={totalPages}
          isLoading={store.isLoading}
          onOpenPage={onOpenPage}
        />
      </section>
    </main>
  );
}

export default App;
