# Budget Documents

Place the Union Budget document here before starting the backend.

Supported formats:
- `union_budget_2025_26.pdf`  — recommended; full PDF from indiabudget.gov.in
- `union_budget_2025_26.txt`  — plain-text alternative if PDF extraction is slow

The backend loads whichever file is present at startup. If both exist, `.txt` takes priority.
If neither is present, the `/api/v1/budget-calculator` endpoint returns HTTP 503 with a clear message.

Download the official PDF from: https://www.indiabudget.gov.in/doc/Budget_Speech.pdf
