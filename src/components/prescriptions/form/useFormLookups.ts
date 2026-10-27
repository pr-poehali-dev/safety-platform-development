import { useState, useEffect } from "react";

const CATEGORIES_URL = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";
const OBJECTS_URL = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";
const CONTRACTORS_URL = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";
const SUSPENSIONS_URL = "https://functions.poehali.dev/bcc14bec-45e7-4857-867d-95233fa38b64";

export function useFormLookups() {
  const [categories, setCategories] = useState<string[]>([]);
  const [objectsList, setObjectsList] = useState<{ id: number; name: string; places: { id: number; name: string }[] }[]>([]);
  const [contractorsList, setContractorsList] = useState<{ name: string; contracts: { id: number; contract_number: string }[] }[]>([]);
  const [suspensionNumbers, setSuspensionNumbers] = useState<string[]>([]);
  useEffect(() => {
    fetch(CATEGORIES_URL)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data.map((d: { name: string }) => d.name) : []));
    fetch(OBJECTS_URL)
      .then(r => r.json())
      .then(data => setObjectsList(Array.isArray(data) ? data : []));
    fetch(CONTRACTORS_URL)
      .then(r => r.json())
      .then(data => setContractorsList(Array.isArray(data) ? data : []));
    fetch(SUSPENSIONS_URL)
      .then(r => r.json())
      .then((data: { number: string }[]) => setSuspensionNumbers(Array.isArray(data) ? data.map(s => s.number).filter(Boolean) : []));
  }, []);

  return { categories, objectsList, contractorsList, suspensionNumbers };
}
