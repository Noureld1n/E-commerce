drop database if exists ecodb;
CREATE DATABASE ecodb;
use ecodb;

drop table if exists sys_user;
CREATE TABLE sys_user(
user_id			BIGINT		 							NOT NULL auto_increment,
first_name		VARCHAR(50)  							NOT NULL,
last_name		VARCHAR(50)  							NOT NULL,
email 			VARCHAR(100) 							NOT NULL unique,
password  	 	VARCHAR(100) 							NOT NULL,
phone 			VARCHAR(20) 							NOT NULL unique,
register_date	timestamp not null default now(),
role 			ENUM('ROLE_Customer','ROLE_ADMIN')	NOT NULL,
image           VARCHAR(255),

CONSTRAINT user_pk PRIMARY KEY (user_id)

);

drop table if exists customer;
CREATE TABLE customer(
customer_id		BIGINT				NOT NULL,
points			double DEFAULT 0,
CONSTRAINT customer_PK PRIMARY KEY (customer_id),
CONSTRAINT customer_FK FOREIGN KEY (customer_id) REFERENCES sys_user (user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

drop table if exists sys_admin;
CREATE TABLE sys_admin(
admin_id		BIGINT		NOT NULL,
is_active		boolean		default true,
CONSTRAINT admin_PK PRIMARY KEY (admin_id),
CONSTRAINT admin_FK FOREIGN KEY (admin_id) REFERENCES sys_user (user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

drop table if exists credit_card;
CREATE TABLE credit_card(
card_id			BIGINT				NOT NULL auto_increment,
user_id			BIGINT				NOT NULL,
provider		VARCHAR(50)			NOT NULL,
account_number	VARCHAR(50)			NOT NULL,
expire_date		TIMESTAMP			NOT NULL,
is_default		BOOLEAN				NOT NULL,
CONSTRAINT card_PK PRIMARY KEY (card_id),
CONSTRAINT card_FK FOREIGN KEY (user_id) REFERENCES sys_user (user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

drop table if exists address;
CREATE TABLE address(
address_id		BIGINT 				NOT NULL auto_increment,
customer_id		BIGINT				NOT NULL,
street			VARCHAR(100) 		NOT NULL,
city			VARCHAR(50) 		NOT NULL,
state			VARCHAR(50) 		NOT NULL,
zipcode         VARCHAR(20),
address_type	ENUM('WORK','HOME') NOT NULL,
is_default      BOOLEAN             DEFAULT false,
CONSTRAINT address_PK PRIMARY KEY (address_id),
CONSTRAINT address_FK FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE
);

drop table if exists category;
CREATE TABLE category(
category_id		BIGINT		NOT NULL auto_increment,
category_name	VARCHAR(50)	NOT NULL,
CONSTRAINT category_pk PRIMARY KEY (category_id)
);

drop table if exists promotion;
CREATE TABLE promotion(
promotion_id		BIGINT		NOT NULL auto_increment,
promo_name			VARCHAR(50)	NOT NULL,
promo_description	VARCHAR(255),
discount			DECIMAL(5,2)	NOT NULL,
start_date			TIMESTAMP	NOT NULL,
end_date			TIMESTAMP	NOT NULL,
CONSTRAINT promotion_PK PRIMARY KEY (promotion_id)
);

drop table if exists promotion_category;
CREATE TABLE promotion_category(
category_id		BIGINT		NOT NULL,
promotion_id	BIGINT		NOT NULL,
CONSTRAINT promotion_category_PK PRIMARY KEY (category_id,promotion_id),
CONSTRAINT promotion_category_FK1 FOREIGN KEY (category_id) REFERENCES category (category_id) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT promotion_category_FK2 FOREIGN KEY (promotion_id) REFERENCES promotion (promotion_id) ON DELETE CASCADE ON UPDATE CASCADE
);

drop table if exists product;
CREATE TABLE product(
product_id		BIGINT 		NOT NULL auto_increment,
admin_id		BIGINT		NOT NULL,
category_id		BIGINT		NOT NULL,
product_name    VARCHAR(100) NOT NULL,
price			double		NOT NULL,
is_available	boolean		default true,
creation_date	timestamp	default now(),
pro_description VARCHAR(1000),
details         TEXT,
quantity_in_stock INT       DEFAULT 0,
size            VARCHAR(50),
color           VARCHAR(50),
CONSTRAINT product_pk PRIMARY KEY (product_id),
CONSTRAINT product_fk1 FOREIGN KEY (admin_id) REFERENCES sys_admin (admin_id) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT product_fk2 FOREIGN KEY (category_id) REFERENCES category (category_id) ON UPDATE CASCADE
);

-- New table for product images
drop table if exists product_image;
CREATE TABLE product_image(
image_id		BIGINT		NOT NULL auto_increment,
product_id		BIGINT		NOT NULL,
image_url		VARCHAR(255)	NOT NULL,
is_main			BOOLEAN		DEFAULT false,
CONSTRAINT image_pk PRIMARY KEY (image_id),
CONSTRAINT image_fk FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE ON UPDATE CASCADE
);

drop table if exists shopping_cart;
CREATE TABLE shopping_cart(
cart_id			BIGINT		NOT NULL auto_increment,
customer_id		BIGINT		NOT NULL UNIQUE,
cart_status		ENUM('Active','Completed') DEFAULT 'Active',
created_at      TIMESTAMP   DEFAULT NOW(),
updated_at      TIMESTAMP   DEFAULT NOW() ON UPDATE NOW(),
CONSTRAINT cart_PK PRIMARY KEY (cart_id),
CONSTRAINT cart_FK FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE
);

drop table if exists cart_item;
CREATE TABLE cart_item(
cart_id			BIGINT		NOT NULL,
product_id		BIGINT		NOT NULL,
quantity		INT			NOT NULL DEFAULT 1 CHECK (quantity > 0),
CONSTRAINT cart_item_PK	PRIMARY KEY (cart_id, product_id),
CONSTRAINT cart_item_FK1 FOREIGN KEY (cart_id) REFERENCES shopping_cart (cart_id) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT cart_item_FK2 FOREIGN KEY (product_id) REFERENCES product (product_id) ON UPDATE CASCADE ON DELETE CASCADE
);

drop table if exists sys_order;
CREATE TABLE sys_order(
order_id		BIGINT		NOT NULL auto_increment,
customer_id		BIGINT		NOT NULL,
total_price		DOUBLE		NOT NULL,
creation_date	timestamp	default now(),
order_status	ENUM('Pending','Processing','Shipped','Delivered','Cancelled') DEFAULT 'Pending',
payment_status  ENUM('Pending','Completed','Failed','Refunded') DEFAULT 'Pending',
shipping_address_id BIGINT,
billing_address_id BIGINT,
CONSTRAINT order_PK PRIMARY KEY (order_id),
CONSTRAINT order_FK1 FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT order_FK2 FOREIGN KEY (shipping_address_id) REFERENCES address (address_id) ON DELETE SET NULL ON UPDATE CASCADE,
CONSTRAINT order_FK3 FOREIGN KEY (billing_address_id) REFERENCES address (address_id) ON DELETE SET NULL ON UPDATE CASCADE
);

drop table if exists order_item;
CREATE TABLE order_item (
order_id 		BIGINT 		NOT NULL,
product_id 		BIGINT 		NOT NULL,
quantity 		INT NOT NULL CHECK (quantity > 0),
price_at_purchase DOUBLE    NOT NULL,
CONSTRAINT order_item_PK PRIMARY KEY (order_id, product_id),
CONSTRAINT order_item_FK1 FOREIGN KEY (order_id) REFERENCES sys_order (order_id) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT order_item_FK2 FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE ON UPDATE CASCADE
);

drop table if exists shipment;
CREATE TABLE shipment(
shipment_id		BIGINT		NOT NULL auto_increment,
order_id		BIGINT		NOT NULL UNIQUE,
is_delivered	BOOLEAN		DEFAULT false,
tracking_number VARCHAR(50),
carrier         VARCHAR(50),
expected_time	TIMESTAMP,
actual_delivery_time TIMESTAMP,
CONSTRAINT shipment_pk PRIMARY KEY (shipment_id),	
CONSTRAINT shipment_fk1 FOREIGN KEY (order_id) REFERENCES sys_order (order_id) ON UPDATE CASCADE ON DELETE CASCADE
);

drop table if exists product_review;
CREATE TABLE product_review(
review_id		BIGINT		NOT NULL auto_increment,
customer_id		BIGINT		NOT NULL,
product_id		BIGINT		NOT NULL,
title			VARCHAR(100)	NOT NULL,
review_text		VARCHAR(1000) NOT NULL,
rating          INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
recommended		BOOLEAN		NOT NULL,
review_date     TIMESTAMP   DEFAULT now(),
CONSTRAINT review_pk PRIMARY KEY (review_id),	
CONSTRAINT review_fk1 FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT review_fk2 FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE
);

drop table if exists wish_list;
CREATE TABLE wish_list(
wish_item_id	BIGINT		NOT NULL auto_increment,
customer_id		BIGINT		NOT NULL,
product_id		BIGINT		NOT NULL,
added_date      TIMESTAMP   DEFAULT NOW(),
CONSTRAINT wish_list_pk PRIMARY KEY (wish_item_id),	
CONSTRAINT wish_list_fk1 FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT wish_list_fk2 FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT wish_list_unique UNIQUE (customer_id, product_id)
);

drop table if exists feedback;
CREATE TABLE feedback(
feedback_id		BIGINT		NOT NULL auto_increment,
customer_id		BIGINT		NOT NULL,
feedback_text	VARCHAR(1000)	NOT NULL,
feedback_date	TIMESTAMP	DEFAULT NOW(),
is_satisfied	BOOLEAN		NOT NULL,
CONSTRAINT feedback_pk PRIMARY KEY (feedback_id),
CONSTRAINT feedback_fk FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Insert some initial admin user for testing
INSERT INTO sys_user (first_name, last_name, email, password, phone, role)
VALUES ('Admin', 'User', 'admin1@ecodb.com', 'admin123', '1234567891', 'ROLE_ADMIN');

INSERT INTO sys_admin (admin_id) 
VALUES (LAST_INSERT_ID());

select * from customer;

select * from sys_admin;

SELECT u.user_id, u.first_name, u.last_name, u.email,u.password, u.role, a.is_active 
FROM sys_user u 
JOIN sys_admin a ON u.user_id = a.admin_id 
WHERE u.role = 'ROLE_ADMIN';

SELECT user_id, first_name, last_name, email, role, register_date , password
FROM sys_user 
ORDER BY user_id;

UPDATE sys_user 
SET password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.' 
WHERE email = 'admin@ecodb.com';
