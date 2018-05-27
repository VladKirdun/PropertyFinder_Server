Run the 1st command line and write:
1. mongod --dbpath C:/Users/local_user/Desktop/gps/data 

Run the 2nd command line and write:
1. cd C:/Users/local_user/Desktop/gps
2. node server

Run the 3rd command line and write:
1. cd C:/Users/local_user/Desktop/gps/data
2. mongo
   - show dbs 
   - use gps
     - db.users.remove({})
     - db.getCollections()
     - db.pares.find()
     - db.pares.find({id: "vlad"})
