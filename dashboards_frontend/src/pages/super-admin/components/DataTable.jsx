import React, { useState, useMemo } from 'react';
import styles from './DataTable.module.css';

export function DataTable({
  columns,
  data,
  searchable = true,
  filterable = false,
  rowsPerPage = 25,
  onRowClick,
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  };

  const filteredData = useMemo(() => {
    let result = data;

    if (searchable && searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = row[col.key];
          return value ? String(value).toLowerCase().includes(term) : false;
        })
      );
    }

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue === bValue) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        const comparison = String(aValue).localeCompare(String(bValue), undefined, {
          numeric: true,
        });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, sortColumn, sortDirection, searchTerm, columns]);

  const pageCount = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = currentPage * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className={styles.container}>
      {searchable && (
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className={styles.searchInput}
          />
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={{ cursor: col.sortable !== false ? 'pointer' : 'default' }}
                  className={sortColumn === col.key ? styles.sortedHeader : ''}
                >
                  <div className={styles.headerContent}>
                    {col.label}
                    {col.sortable !== false && sortColumn === col.key && (
                      <span className={styles.sortIcon}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key]}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className={styles.emptyState}>
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className={styles.pagination}>
          <button
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
          >
            ← Previous
          </button>
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            disabled={currentPage >= pageCount - 1}
            onClick={() => setCurrentPage(Math.min(pageCount - 1, currentPage + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
