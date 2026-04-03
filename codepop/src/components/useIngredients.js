import { useState, useEffect } from 'react';
import { getBaseURL } from '../../ip_address';
import ingredientMeta from './Ingredients';

const DEFAULT_META = { color: '#AADDCC', emoji: '🥤' };

let cachedIngredients = null;

const toOptions = (names) =>
  names.map((name) => {
    const key = name.toLowerCase();
    const meta = ingredientMeta[key] || DEFAULT_META;
    return { label: key, value: key, ...meta };
  });

export const useIngredients = () => {
  const [sodaOptions, setSodaOptions] = useState(cachedIngredients?.sodas || []);
  const [syrupOptions, setSyrupOptions] = useState(cachedIngredients?.syrups || []);
  const [addInOptions, setAddInOptions] = useState(cachedIngredients?.addIns || []);
  const [loading, setLoading] = useState(!cachedIngredients);

  useEffect(() => {
    if (cachedIngredients) return;

    fetch(`${getBaseURL()}/backend/ingredients/`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch ingredients');
        return r.json();
      })
      .then((data) => {
        const sodas = toOptions(data.sodas);
        const syrups = toOptions(data.syrups);
        const addIns = toOptions(data.add_ins);
        cachedIngredients = { sodas, syrups, addIns };
        setSodaOptions(sodas);
        setSyrupOptions(syrups);
        setAddInOptions(addIns);
      })
      .catch((err) => console.error('Failed to fetch ingredients:', err))
      .finally(() => setLoading(false));
  }, []);

  return { sodaOptions, syrupOptions, addInOptions, loading };
};
