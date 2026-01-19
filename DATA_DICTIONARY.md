# Inventory Dashboard - Data Dictionary & Context

## Overview

This dashboard provides visibility into inventory levels, consumption patterns, and raw material inward tracking for Ultrahuman's manufacturing operations. Data is sourced from Metabase reports that are automatically synced to Google Sheets.

---

## Data Sources

### 1. Inventory Qty Sheet
- **Google Sheet ID**: `1sloqBYcpvymJCszFtrk_QM_EmhB3uSmJ93bYfFBET0o`
- **Source**: Metabase Alert "Inventory Qty"
- **Refresh Frequency**: Daily via email subscription
- **Description**: Current stock levels across all products

### 2. Consumption MoM Sheet
- **Google Sheet ID**: `1O3ERZ7iq-MRlRmGTlgb7nHJ339r1JVz0VjdJQ1iGvyw`
- **Source**: Metabase Alert "Consumption MoM"
- **Refresh Frequency**: Daily via email subscription
- **Description**: Monthly consumption data by product

### 3. RM Inwarded Sheet
- **Google Sheet ID**: `1tXtBsHxrT-ARHp7hKh4FzKAnfhj0pToMWufEk0od7FY`
- **Source**: Metabase Alert "RM Inwarded"
- **Refresh Frequency**: Daily via email subscription
- **Description**: Raw material inward transactions

---

## Column Definitions

### Inventory Qty Sheet

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `Row Labels` | String | Product category (e.g., "Coated Shells", "Air Ring / Air Ring FG and Charger") |
| `day` | Date | Date of the inventory snapshot |
| `PRODUCT_NAME` | String | Unique product identifier/SKU |
| `PV - Restricted Inventory` | Number | Previous version restricted inventory (legacy) |
| `Restricted Inventory` | Number | Stock that is on hold/blocked (quality hold, pending inspection, etc.) |
| `Unrestricted Inventory` | Number | Stock available for use/sale |
| `WIP Inventory` | Number | Work-in-Progress inventory (partially completed items) |
| `Grand Total` | Number | Sum of all inventory types |

### Consumption MoM Sheet

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `balance_month` | Number | Month of consumption (1-12) |
| `balance_year` | Number | Year of consumption (e.g., 2025) |
| `product_barcode` | String | Product identifier matching PRODUCT_NAME |
| `total_consumption` | Number | Total units consumed during the month |

### RM Inwarded Sheet

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `Date` | Date | Date of inward transaction |
| `Part No` | String | Part number/SKU of the material |
| `Qty` | Number | Quantity received |
| `name` | String | Lot name or vendor identifier |
| `Location Moved` | String | Warehouse/location where material was moved |
| `po_number` | String | Purchase Order number (if applicable) |
| `price` | Number | Unit price in INR |

---

## Calculated Metrics

### 1. Daily Run Rate (DRR)

**Formula:**
```
DRR = Monthly Consumption / 30
```

**Description:** Average daily consumption rate based on the most recent month's consumption data. Used to estimate how quickly inventory is being depleted.

**Example:**
- If monthly consumption = 3,000 units
- DRR = 3,000 / 30 = 100 units/day

---

### 2. Days of Cover (DoC)

**Formula:**
```
DoC = Current Stock / DRR
```

Where:
- `Current Stock` = Unrestricted Inventory + Restricted Inventory
- `DRR` = Daily Run Rate (calculated above)

**Description:** Estimates how many days the current inventory will last at the current consumption rate. Critical for inventory planning and reorder decisions.

**Example:**
- If current stock = 5,000 units
- DRR = 100 units/day
- DoC = 5,000 / 100 = 50 days

**Status Thresholds:**
| DoC Range | Status | Action Required |
|-----------|--------|-----------------|
| < 7 days | Critical (Red) | Immediate reorder needed |
| 7-30 days | Low (Yellow) | Plan replenishment |
| > 30 days | Healthy (Green) | Adequate coverage |
| No consumption data | No Data (Gray) | Cannot calculate |

---

### 3. Total Unrestricted Inventory

**Formula:**
```
Total Unrestricted = SUM(Unrestricted Inventory) for all products
```

**Description:** Total units available for immediate use across all SKUs.

---

### 4. Total Restricted Inventory

**Formula:**
```
Total Restricted = SUM(Restricted Inventory) for all products
```

**Description:** Total units on hold across all SKUs. These may be pending quality checks, customer holds, or other restrictions.

---

### 5. Total Inwarded Quantity

**Formula:**
```
Total Inwarded = SUM(Qty) for all inward transactions
```

**Description:** Total units received from vendors/suppliers.

---

### 6. Total Inwarded Value

**Formula:**
```
Total Value = SUM(Qty × price) for all inward transactions
```

**Description:** Total monetary value of materials received (in INR).

---

### 7. Average DRR

**Formula:**
```
Avg DRR = Total Monthly Consumption / 30
```

**Description:** Overall average daily consumption across all products for the latest month.

---

## Dashboard Tabs

### Tab 1: Current Inventory

**Purpose:** Real-time view of stock levels

**Key Metrics:**
- Total Unrestricted Inventory
- Total Restricted Inventory
- Product Categories count
- Zero Stock Items (items with 0 inventory)

**Charts:**
- Inventory by Category (Doughnut chart)
- Top 10 Products by Stock (Horizontal bar chart)

**Table Columns:** Category, Product Name, Restricted, Unrestricted, Total

---

### Tab 2: Consumption & DRR

**Purpose:** Track consumption trends and daily run rates

**Key Metrics:**
- Total Monthly Consumption (latest month)
- Average Daily Run Rate
- Active Products (with consumption > 0)
- Months of Data (available history)

**Charts:**
- Monthly Consumption Trend (Line chart)

**Table Columns:** Month/Year, Product, Monthly Consumption, DRR

**Filters:** Year, Month, Search

---

### Tab 3: Days of Cover

**Purpose:** Identify inventory risks and reorder needs

**Key Metrics:**
- Critical Stock count (< 7 days)
- Low Stock count (7-30 days)
- Healthy Stock count (> 30 days)
- No Consumption Data count

**Charts:**
- Stock Coverage Distribution (Pie chart)

**Table Columns:** Product, Current Stock, Monthly Consumption, DRR, Days of Cover, Status

**Status Badges:**
- `Critical` - Red badge for DoC < 7
- `Low` - Yellow badge for DoC 7-30
- `Healthy` - Green badge for DoC > 30
- `No Data` - Gray badge when DRR = 0

---

### Tab 4: RM Inwarded

**Purpose:** Track raw material receipts

**Key Metrics:**
- Total Inwarded Qty
- Total Value (INR)
- Unique Vendors/Sources
- Recent Receipts (last 7 days)

**Charts:**
- Daily Inward Trend (Bar chart - last 30 days)

**Table Columns:** Date, Part No, Name/Vendor, Location, Qty, PO Number, Price

**Filters:** Date From, Date To, Vendor, Search

---

## Data Flow Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Metabase   │────▶│   Gmail     │────▶│Google Sheets│────▶│  Dashboard  │
│  (Queries)  │     │  (Alerts)   │     │  (Storage)  │     │  (Display)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Apps Script │
                    │ (Automation)│
                    └─────────────┘
```

1. **Metabase** runs scheduled queries and sends email alerts with CSV attachments
2. **Gmail** receives emails from `metabase@ultrahuman.com`
3. **Google Apps Script** processes emails and extracts CSV data
4. **Google Sheets** stores the data (updated daily)
5. **Dashboard** fetches data directly from published Google Sheets

---

## Inventory Types Explained

### Unrestricted Inventory
- Available for immediate use in production or sale
- No holds or quality issues
- Can be allocated to orders

### Restricted Inventory
- Stock on hold for various reasons:
  - Quality inspection pending
  - Customer-specific holds
  - Damaged goods under review
  - Regulatory compliance checks

### WIP (Work-in-Progress) Inventory
- Partially completed products
- Items currently in production
- Not yet finished goods

---

## Product Categories

Common categories in the inventory:
- **Coated Shells** - Finished shell components with coating
- **Uncoated Shells** - Raw shell components
- **Air Ring / Air Ring FG and Charger** - Air Ring finished goods and chargers
- **Air Ring Sub FG - Casting** - Sub-assembly casting components
- **Air Ring Sub FG - Assembly** - Sub-assembly components
- **DC Charger** - Direct current charger products
- **C3 Top** - C3 product line top components
- **Others** - Miscellaneous items

---

## Notes & Assumptions

1. **DRR Calculation**: Uses 30 days as the standard month length for simplicity
2. **DoC Calculation**: Uses most recent month's consumption as the baseline
3. **Stock for DoC**: Combines both Unrestricted and Restricted inventory
4. **Data Freshness**: Data is as fresh as the last Metabase email sync (typically daily at 7 AM)
5. **Currency**: All monetary values are in Indian Rupees (INR)
6. **Date Format**: Dates may appear in various formats (YYYY-MM-DD, DD/MM/YYYY)

---

## Troubleshooting

### Dashboard shows no data
1. Check if Google Sheets are publicly accessible (View access)
2. Verify Google Apps Script ran successfully
3. Check browser console for errors (F12 → Console)

### Numbers appear incorrect
- Numbers with commas (e.g., "1,234.56") are automatically parsed
- Check source data in Google Sheets for accuracy

### DoC shows "No Data"
- Product has no consumption history
- Cannot calculate daily run rate without consumption data

---

## Change Log

| Date | Change |
|------|--------|
| 2026-01-19 | Initial dashboard creation |
| 2026-01-19 | Added Google Sheets integration |
| 2026-01-19 | Fixed column mappings for new sheet structure |
| 2026-01-19 | Added support for comma-separated numbers |

---

## Contact

For questions about this dashboard or data definitions, contact the Inventory/Supply Chain team.
