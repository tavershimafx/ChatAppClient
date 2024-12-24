import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { faker } from '@faker-js/faker';


@Component({
  selector: 'fake-data',
  templateUrl: './fake-data.component.html',
  styleUrls: ['./fake-data.component.css']
})
export class FakeDataComponent implements OnInit{
 
  @ViewChild("downloadBtn", { static: true }) downloadBtn!: ElementRef
  constructor(){

  }

  ngOnInit(): void {
    
  }

  createUsers(){
    let users = faker.helpers.multiple(this.createRandomUser, {
      count: 500
    })



    let file = new Blob([JSON.stringify(users)], { type: "application/json",  })
    let rl = URL.createObjectURL(file)
    this.downloadBtn.nativeElement.href = rl
    this.downloadBtn.nativeElement.download = "fake_users.json"
    this.downloadBtn.nativeElement.click()

    
    let transactions = faker.helpers.multiple(this.createTransaction, {
      count: 25000
    })
    file = new Blob([JSON.stringify(transactions)], { type: "application/json",  })
    rl = URL.createObjectURL(file)
    this.downloadBtn.nativeElement.href = rl
    this.downloadBtn.nativeElement.download = "user_transactions.json"
    this.downloadBtn.nativeElement.click()

    
    let accounts = faker.helpers.multiple(this.createAccount, {
      count: 500
    })
    file = new Blob([JSON.stringify(accounts)], { type: "application/json",  })
    rl = URL.createObjectURL(file)
    this.downloadBtn.nativeElement.href = rl
    this.downloadBtn.nativeElement.download = "user_accounts.json"
    this.downloadBtn.nativeElement.click()
    
    let products = faker.helpers.multiple(this.createProduct, {
      count: 30
    })
    file = new Blob([JSON.stringify(products)], { type: "application/json",  })
    rl = URL.createObjectURL(file)
    this.downloadBtn.nativeElement.href = rl
    this.downloadBtn.nativeElement.download = "products.json"
    this.downloadBtn.nativeElement.click()

    let creditCard = faker.helpers.multiple(this.createCards, {
      count: 500
    })
    file = new Blob([JSON.stringify(creditCard)], { type: "application/json",  })
    rl = URL.createObjectURL(file)
    this.downloadBtn.nativeElement.href = rl
    this.downloadBtn.nativeElement.download = "credit_cards.json"
    this.downloadBtn.nativeElement.click()
    console.log("done")
  }

  createRandomUser() {
    return {
      id: faker.number.int(10000),
      username: faker.internet.username(), // before version 9.1.0, use userName()
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      // avatar: faker.image.avatar(),
      // password: faker.internet.password(),
      // birthdate: faker.date.between({ from: "01-01-2024", to: "01-10-2024"}),
      // registeredAt: faker.date.past(),
      accountNumber: faker.finance.accountNumber(10)
    };
  }

  createTransaction() {
    return {
      //id: faker.number.int(50000),
      userId: faker.number.int(10000),
      transactionType: faker.helpers.arrayElement(['debit', 'credit']), 
      amount: faker.number.float({ min: 5000, max: 10000, fractionDigits: 2 }),
      date: faker.date.between({ from: "01-01-2024", to: "10-10-2024"}),
      note: faker.finance.transactionDescription()
    };
  }

  createAccount() {
    return {
      //id: faker.number.int(10000),
      userId: faker.number.int(10000),
      balance: faker.number.float({ min: 1000000, max: 5000000, fractionDigits: 2 }),
      lastTransactionAmount: faker.number.float({ min: 5000, max: 10000, fractionDigits: 2 }),
      date: faker.date.between({ from: "01-01-2024", to: "10-10-2024"}),
      cardNumber: faker.finance.creditCardNumber(),
      cvv: faker.finance.creditCardCVV(),
      expiry: faker.date.between({ from: "01-01-2024", to: "10-10-2026"})
    };
  }

  createProduct() {
    return {
      name: faker.commerce.productName(),
      shortDescription: faker.commerce.productDescription(),
      thumbnail: faker.helpers.arrayElement(["/products/fs10_785x.jpg","/products/fs18_785x.jpg","/products/fs20_785x.jpg","/products/fs21_200x.jpg","/products/fs21_785x.jpg","/products/fs22_785x.jpg","/products/h18_570x.jpg","/products/h19_570x.jpg","/products/p1-800x800_200x.jpg","/products/p14_3-800x800_785x.jpg","/products/p16-800x800_200x.jpg","/products/p16-800x800_785x.jpg","/products/p23-800x800_785x.jpg","/products/p3-800x800_785x.png","/products/p3_3-800x800_785x.png","/products/p5-800x800_785x.jpg","/products/p5_2-800x800_200x.jpg","/products/p5_3-800x800_785x.jpg","/products/product-image-1433906985_940x.jpg","/products/product-image-1631690169_940x.jpg","/products/product-image-1670243328_640x.jpg","/products/product-image-1711947208_640x.jpg","/products/product-image-1724464633_1370x.jpg","/products/product-image-1734150993_640x.jpg","/products/product-image-1767969866_940x.jpg","/products/product-image-1770113623_940x.jpg","/products/product-image-1823570720_640x.jpg","/products/product-image-1834621321_940x.jpg"]),
      price: faker.number.float({ min: 100, max: 1000, fractionDigits: 2 }),
      discount: faker.number.int({ min: 5, max: 10 }),
    };
  }

  createCards() {
    return {
      cardNumber: faker.finance.creditCardNumber(),
      cvv: faker.finance.creditCardCVV(),
      expiry: faker.date.between({ from: "01-01-2024", to: "10-10-2026"}),
    };
  }
}
