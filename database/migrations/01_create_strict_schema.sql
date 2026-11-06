-- ========================================================================
-- HOPE Group4: STRICT 10-TABLE SCHEMA (PostgreSQL / Supabase DDL)
-- Subject: Information Management
-- 100% Faithful to Hope ERD (Zero new tables, zero new columns)
-- ========================================================================

-- Reverse cleanup
DROP VIEW IF EXISTS v_employee_current_status CASCADE;
DROP VIEW IF EXISTS v_department_sales_performance CASCADE;
DROP VIEW IF EXISTS v_customer_receivables CASCADE;
DROP VIEW IF EXISTS v_sales_summary CASCADE;
DROP VIEW IF EXISTS v_sales_with_dept CASCADE;
DROP VIEW IF EXISTS v_sales_details_priced CASCADE;

DROP TABLE IF EXISTS PAYMENT CASCADE;
DROP TABLE IF EXISTS SALESDETAIL CASCADE;
DROP TABLE IF EXISTS SALES CASCADE;
DROP TABLE IF EXISTS PRICEHIST CASCADE;
DROP TABLE IF EXISTS PRODUCT CASCADE;
DROP TABLE IF EXISTS CUSTOMER CASCADE;
DROP TABLE IF EXISTS JOBHISTORY CASCADE;
DROP TABLE IF EXISTS DEPARTMENT CASCADE;
DROP TABLE IF EXISTS JOB CASCADE;
DROP TABLE IF EXISTS EMPLOYEE CASCADE;

-- 1. DEPARTMENT
CREATE TABLE DEPARTMENT (
    deptCode VARCHAR(10) NOT NULL,
    deptName VARCHAR(100) NOT NULL,
    CONSTRAINT pk_department PRIMARY KEY (deptCode),
    CONSTRAINT uq_department_name UNIQUE (deptName)
);

-- 2. JOB
CREATE TABLE JOB (
    jobCode VARCHAR(10) NOT NULL,
    jobDesc VARCHAR(100) NOT NULL,
    CONSTRAINT pk_job PRIMARY KEY (jobCode)
);

-- 3. EMPLOYEE
CREATE TABLE EMPLOYEE (
    empNo INT NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    firstName VARCHAR(50) NOT NULL,
    gender CHAR(1) NOT NULL,
    birthDate DATE NOT NULL,
    hireDate DATE NOT NULL,
    sepDate DATE NULL,
    CONSTRAINT pk_employee PRIMARY KEY (empNo),
    CONSTRAINT chk_employee_gender CHECK (gender IN ('M', 'F', 'm', 'f')),
    CONSTRAINT chk_employee_dates CHECK (hireDate >= birthDate),
    CONSTRAINT chk_employee_sepdate CHECK (sepDate IS NULL OR sepDate >= hireDate)
);

-- 4. JOBHISTORY (Composite PK: empNo + jobCode + effDate)
CREATE TABLE JOBHISTORY (
    empNo INT NOT NULL,
    jobCode VARCHAR(10) NOT NULL,
    effDate DATE NOT NULL,
    salary NUMERIC(12, 2) NOT NULL,
    deptCode VARCHAR(10) NOT NULL,
    CONSTRAINT pk_jobhistory PRIMARY KEY (empNo, jobCode, effDate),
    CONSTRAINT uq_jobhistory_emp_eff UNIQUE (empNo, effDate),
    CONSTRAINT fk_jobhistory_employee FOREIGN KEY (empNo) 
        REFERENCES EMPLOYEE(empNo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_jobhistory_job FOREIGN KEY (jobCode) 
        REFERENCES JOB(jobCode) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_jobhistory_department FOREIGN KEY (deptCode) 
        REFERENCES DEPARTMENT(deptCode) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_jobhistory_salary CHECK (salary >= 0)
);

-- 5. CUSTOMER
CREATE TABLE CUSTOMER (
    custNo INT NOT NULL,
    custName VARCHAR(120) NOT NULL,
    address VARCHAR(255) NOT NULL,
    payTerms VARCHAR(50) NOT NULL,
    CONSTRAINT pk_customer PRIMARY KEY (custNo),
    CONSTRAINT chk_customer_payterms CHECK (payTerms IN ('COD', 'NET 15', 'NET 30', 'NET 60'))
);

-- 6. PRODUCT
CREATE TABLE PRODUCT (
    prodCode VARCHAR(20) NOT NULL,
    description VARCHAR(255) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    CONSTRAINT pk_product PRIMARY KEY (prodCode)
);

-- 7. PRICEHIST (Composite PK: prodCode + effDate)
CREATE TABLE PRICEHIST (
    effDate DATE NOT NULL,
    prodCode VARCHAR(20) NOT NULL,
    unitPrice NUMERIC(12, 2) NOT NULL,
    CONSTRAINT pk_pricehist PRIMARY KEY (prodCode, effDate),
    CONSTRAINT fk_pricehist_product FOREIGN KEY (prodCode) 
        REFERENCES PRODUCT(prodCode) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_pricehist_unitprice CHECK (unitPrice >= 0)
);

-- 8. SALES
CREATE TABLE SALES (
    transNo INT NOT NULL,
    salesDate DATE NOT NULL,
    custNo INT NOT NULL,
    empNo INT NOT NULL,
    CONSTRAINT pk_sales PRIMARY KEY (transNo),
    CONSTRAINT fk_sales_customer FOREIGN KEY (custNo) 
        REFERENCES CUSTOMER(custNo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_sales_employee FOREIGN KEY (empNo) 
        REFERENCES EMPLOYEE(empNo) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 9. SALESDETAIL (Composite PK: transNo + prodCode)
CREATE TABLE SALESDETAIL (
    transNo INT NOT NULL,
    prodCode VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    CONSTRAINT pk_salesdetail PRIMARY KEY (transNo, prodCode),
    CONSTRAINT fk_salesdetail_sales FOREIGN KEY (transNo) 
        REFERENCES SALES(transNo) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_salesdetail_product FOREIGN KEY (prodCode) 
        REFERENCES PRODUCT(prodCode) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_salesdetail_qty CHECK (quantity > 0)
);

-- 10. PAYMENT
CREATE TABLE PAYMENT (
    ORNo INT NOT NULL,
    payDate DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    transNo INT NOT NULL,
    CONSTRAINT pk_payment PRIMARY KEY (ORNo),
    CONSTRAINT fk_payment_sales FOREIGN KEY (transNo) 
        REFERENCES SALES(transNo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

-- Performance Indexes for Temporal Lookups
CREATE INDEX idx_jobhistory_lookup ON JOBHISTORY (empNo, effDate DESC);
CREATE INDEX idx_pricehist_lookup ON PRICEHIST (prodCode, effDate DESC);
CREATE INDEX idx_sales_date ON SALES (salesDate);
CREATE INDEX idx_sales_customer ON SALES (custNo);
CREATE INDEX idx_sales_employee ON SALES (empNo);
CREATE INDEX idx_payment_trans ON PAYMENT (transNo);
