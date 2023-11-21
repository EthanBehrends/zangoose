# Zangoose

A Zod-powered wrapper for Mongoose providing effortless typesafety.

## Installation

Add Zangoose to your project

```
pnpm i zangoose --save
```

## Getting started

Define a new model using the Zangoose's `model` function, which takes a Zod schema as the argument.

```typescript
const BlogPost = model(z.object({
    title: z.string(),
    content: z.string(),
    slug: z.string(),
    author: z.string().optional()
}))
```

You can add methods, indexes, hooks, and virtuals by chaining the `with` method.

```typescript
model(blogPostSchema).with({
    statics: {
        async getBySlug(slug: string) {
            return await this.findOne({ slug })
        }
    },
    methods: {
        addComment(comment: Comment) {
            this.comments.push(comment)
        }
    },
    pre: {
        validate() {
            this.slug = this.title
                .replace(/[^a-zA-Z\s]/g, '')
                .replace(/ ./g, (c) => '-' + c.trim().toUpperCase())
        }
    },
    virtuals: {
        dateDisplay() {
            return this.createdAt.format('YYYY-MM-DD')
        }
    }
})
```

## Typesafety
Mongoose's ad-hoc approach to typesafety makes it difficult to use in a Typescript codebase. Zangoose fixes this by making secure typing incredibly easy to maintain.

Once you've defined your schema, the `with` method provides helpful typing while augmenting your model.

## Opinionated
In general, Zangoose maintains support for most Mongoose features. However, it's not feasible to provide a typesafe experience for some features.

Zangoose does not currently provide support for Mongoose's `populate`. Instead, it's recommended as a best practice to do these operations manually.

```typescript
// Old
const schema = mongoose.Schema({
    name: { type: string },
    friends: { type: mongoose.ObjectId, ref: 'Person' }
})

const Person = mongoose.Model("Person", schema)

const person = await Person.findOne().populate('friends') // person.Friends is not typesafe



// With Zangoose
const Person = model({
    name: z.string(),
    friends: zObjectId().array()
})

const person = await Person.findOne()

const friends = await Person.find({ _id: { $in: person.friends }})
```

## ⚠️ Caveats
### Incompatible Mongoose types
Some Mongoose methods declare a `Partial` type of the model. This means that we lose some accuracy when defining new models.

```typescript
const Person = model(z.object({
    name: z.string(),
    email: z.string(),
}))

// This should be a type error, but it isn't.
await Person.create({
    name: "John Doe"
})
```

By running the script, this now errors like we would expect.

## Migration warnings
If the schema of the model changes, retrieving previous data may result in unexpected results. By default, Zangoose will throw an error when this happens. This behavior can be disabled by ...