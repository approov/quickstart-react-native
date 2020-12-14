# Approov SDK Assets

Put the `approov.config` file in this directory using the command `approov sdk -getConfig approov.config`

Create the `approov.props` file in this directory and set it up something like this:

```
# Approov SDK properties

# Name of token field (default: Approov-Token)
token.name=Approov-Token

# Prefix to add to token field value (default: "")
token.prefix=

# Name of binding field (default: Authorization)
binding.name=Authorization

# Prefix to strip from binding field value (default: Bearer)
binding.prefix=Bearer
```
