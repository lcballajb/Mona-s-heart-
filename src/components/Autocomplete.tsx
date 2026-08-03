import { useEffect, useId, useRef, useState } from "react";
import {
  searchDiagnoses,
  searchMedications,
  searchMedicationFallback,
  type DiagnosisTerm,
  type MedicationTerm,
} from "../health/terminology";

type MedicationProps = {
  onSelect: (term: MedicationTerm | null, freeText?: string) => void;
  label?: string;
};
export function MedicationAutocomplete({
  onSelect,
  label = "Medication",
}: MedicationProps) {
  const id = useId(),
    timer = useRef<number>();
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<MedicationTerm[]>([]),
    [active, setActive] = useState(-1),
    [loading, setLoading] = useState(false),
    [open, setOpen] = useState(false),
    [error, setError] = useState<string | null>(null),
    [fallback, setFallback] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    window.clearTimeout(timer.current);
    setActive(-1);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    timer.current = window.setTimeout(async () => {
      try {
        const response = await searchMedications(query, controller.signal);
        setResults(response.results);
        setFallback(response.fallback);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Medication terminology is unavailable.",
        );
        setResults(searchMedicationFallback(query));
        setFallback(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer.current);
      controller.abort();
    };
  }, [query, retry]);
  const choose = (term: MedicationTerm) => {
    onSelect(term);
    setQuery(term.genericName);
    setResults([]);
    setOpen(false);
  };
  const chooseFreeText = () => {
    onSelect(null, query.trim());
    setResults([]);
    setOpen(false);
  };
  const showOptions = open && query.trim().length >= 2 && !loading;
  return (
    <div className="autocomplete">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={showOptions}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onSelect(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          }
          if (e.key === "Enter" && active >= 0 && active < results.length) {
            e.preventDefault();
            choose(results[active]);
          }
          if (e.key === "Enter" && active === results.length && showOptions) {
            e.preventDefault();
            chooseFreeText();
          }
          if (e.key === "Escape") {
            setResults([]);
            setOpen(false);
          }
        }}
        placeholder="Type at least 2 characters"
        autoComplete="off"
      />
      <span className="sr-only" aria-live="polite">
        {loading
          ? "Searching"
          : (error ?? `${results.length} suggestions available`)}
      </span>
      {query.length > 0 && query.length < 2 && (
        <small>Enter at least 2 characters.</small>
      )}
      {error && (
        <div role="alert">
          <span>{error} Your text has been preserved. </span>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}
      {fallback && (
        <p className="fieldnotice">
          Fallback terminology data—verification may be limited.
        </p>
      )}
      {showOptions && (
        <ul id={`${id}-list`} role="listbox">
          {results.map((m, i) => (
            <li
              id={`${id}-${i}`}
              role="option"
              aria-selected={active === i}
              key={m.rxcui ?? m.genericName}
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(m)}
              >
                <b>{m.genericName}</b>
                {m.brandName && <> · {m.brandName}</>}
                <small>
                  {m.activeIngredient} · {m.strength} · {m.doseForm} · RxCUI{" "}
                  {m.rxcui}
                </small>
                {m.verificationStatus !== "verified" && (
                  <small>Unverified entry</small>
                )}
              </button>
            </li>
          ))}
          <li
            id={`${id}-${results.length}`}
            role="option"
            aria-selected={active === results.length}
          >
            <button type="button" onClick={chooseFreeText}>
              I can’t find my medication — save “{query}” as an Unverified entry
            </button>
          </li>
        </ul>
      )}
      <p className="fieldnotice">
        Medication suggestions are shown only to help you record your existing
        medication history. A listed medication is not a recommendation.
      </p>
    </div>
  );
}
export function DiagnosisAutocomplete({
  onSelect,
  label = "Diagnosis or condition",
}: {
  onSelect: (term: DiagnosisTerm | null) => void;
  label?: string;
}) {
  const id = useId(),
    timer = useRef<number>();
  const [q, setQ] = useState(""),
    [items, setItems] = useState<DiagnosisTerm[]>([]),
    [active, setActive] = useState(-1);
  useEffect(() => {
    window.clearTimeout(timer.current);
    setActive(-1);
    if (q.length < 2) {
      setItems([]);
      return;
    }
    timer.current = window.setTimeout(() => setItems(searchDiagnoses(q)), 250);
    return () => window.clearTimeout(timer.current);
  }, [q]);
  return (
    <div className="autocomplete">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onSelect(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          }
          if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            const d = items[active];
            onSelect(d);
            setQ(d.displayName);
            setItems([]);
          }
        }}
        placeholder="Type at least 2 characters"
      />
      {items.length > 0 && (
        <ul role="listbox" id={`${id}-list`}>
          {items.map((d, i) => (
            <li
              role="option"
              aria-selected={active === i}
              id={`${id}-${i}`}
              key={d.code}
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(d);
                  setQ(d.displayName);
                  setItems([]);
                }}
              >
                <b>{d.displayName}</b>
                <small>
                  {d.system} {d.code} · {d.source}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="fieldnotice">
        Selecting a condition does not confirm a diagnosis. Mona’s Heart does
        not diagnose medical conditions.
      </p>
    </div>
  );
}
