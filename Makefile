up-dev:
	yarn --cwd ./src/functions build && \
	pulumi --cwd ./infra up -s dev --yes --refresh